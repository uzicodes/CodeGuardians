import { Octokit } from "octokit";
import { analyzeSource } from "../analyzer";
import { Finding } from "../types";
import { sql } from "./db";

const SCANNABLE_EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

interface FileScanResult {
  filename: string;
  findings: Finding[];
}

function getSeverityBadge(severity: string): string {
  switch (severity) {
    case "critical":
      return "🔴 **CRITICAL**";
    case "high":
      return "🟠 **HIGH**";
    case "medium":
      return "🟡 **MEDIUM**";
    case "low":
      return "🔵 **LOW**";
    default:
      return `⚪ **${severity.toUpperCase()}**`;
  }
}

export async function processPullRequestScan(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number,
  commitSha: string
) {
  const repoFullName = `${owner}/${repo}`;

  // 1. Initial Check Run Creation (Checks API)
  let checkRunId: number | null = null;
  try {
    const { data: checkRun } = await octokit.rest.checks.create({
      owner,
      repo,
      name: "CodeGuardians Security Check",
      head_sha: commitSha,
      status: "in_progress",
      started_at: new Date().toISOString(),
    });
    checkRunId = checkRun.id;
    console.log(`[Checks API] Created in-progress check run #${checkRunId} for ${repoFullName}@${commitSha.slice(0, 7)}`);
  } catch (err: any) {
    console.error("[Checks API] Failed to create in-progress check run:", err.message);
  }

  // 2. Fetch changed files in the Pull Request
  const { data: files } = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
  });

  const scanResults: FileScanResult[] = [];

  for (const file of files) {
    if (!SCANNABLE_EXTENSIONS.test(file.filename) || file.status === "removed") {
      continue;
    }

    try {
      const { data: fileBlob } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: file.filename,
        ref: commitSha,
      });

      if (!("content" in fileBlob) || !fileBlob.content) continue;

      const rawCode = Buffer.from(fileBlob.content, "base64").toString("utf-8");
      const findings = analyzeSource(rawCode, file.filename);

      if (findings.length > 0) {
        scanResults.push({
          filename: file.filename,
          findings,
        });
      }
    } catch (err: any) {
      console.error(`Failed to analyze ${file.filename}:`, err.message);
    }
  }

  const totalIssues = scanResults.reduce((acc, r) => acc + r.findings.length, 0);

  // 3. Complete the GitHub Check Run
  if (checkRunId !== null) {
    try {
      if (totalIssues > 0) {
        let summary = `### ⚠️ CodeGuardians Security Audit: ${totalIssues} Issue(s) Detected\n\n`;
        summary += `Static AST inspection flagged security vulnerabilities in commit \`${commitSha.slice(0, 7)}\`:\n\n`;

        for (const fileResult of scanResults) {
          summary += `#### 📄 \`${fileResult.filename}\`\n\n`;
          summary += `| Severity | Rule | Location | Description |\n`;
          summary += `| :--- | :--- | :--- | :--- |\n`;

          for (const finding of fileResult.findings) {
            const badge = getSeverityBadge(finding.severity);
            summary += `| ${badge} | \`${finding.ruleId}\` | Line ${finding.line}:${finding.column} | ${finding.message} |\n`;
          }
          summary += `\n`;
        }

        summary += `> **Action Required:** Fix these issues before merging to protect your codebase.\n\n` +
          `_Report generated autonomously by [CodeGuardians](https://github.com/uzicodes/CodeGuardians)._`;

        await octokit.rest.checks.update({
          owner,
          repo,
          check_run_id: checkRunId,
          status: "completed",
          conclusion: "failure",
          completed_at: new Date().toISOString(),
          output: {
            title: `Security Audit: ${totalIssues} Issue(s) Detected`,
            summary,
          },
        });
      } else {
        await octokit.rest.checks.update({
          owner,
          repo,
          check_run_id: checkRunId,
          status: "completed",
          conclusion: "success",
          completed_at: new Date().toISOString(),
          output: {
            title: "Security Check Passed",
            summary: "No hardcoded secrets, unsafe eval() calls, or environment leaks detected by CodeGuardians AST scanner.",
          },
        });
      }
      console.log(`[Checks API] Completed check run #${checkRunId} (conclusion: ${totalIssues === 0 ? "success" : "failure"})`);
    } catch (err: any) {
      console.error("[Checks API] Failed to update check run completion:", err.message);
    }
  }

  // 4. Post PR review comment on GitHub
  await postPRReport(octokit, owner, repo, pullNumber, commitSha, scanResults);

  // 5. Persist audit to Neon PostgreSQL
  await recordAuditRun(repoFullName, pullNumber, commitSha, scanResults);
}

async function recordAuditRun(
  repoName: string,
  prNumber: number,
  commitSha: string,
  results: FileScanResult[]
) {
  const totalIssues = results.reduce((acc, r) => acc + r.findings.length, 0);
  const status = totalIssues === 0 ? "clean" : "vulnerable";

  try {
    const insertedRun = await sql`
      INSERT INTO audit_runs (repo_name, pr_number, commit_sha, status, total_issues)
      VALUES (${repoName}, ${prNumber}, ${commitSha}, ${status}, ${totalIssues})
      RETURNING id
    `;

    const auditId = insertedRun[0]?.id;

    if (auditId && totalIssues > 0) {
      for (const file of results) {
        for (const finding of file.findings) {
          await sql`
            INSERT INTO findings (audit_run_id, file_path, rule_id, severity, line_number, column_number, message)
            VALUES (${auditId}, ${file.filename}, ${finding.ruleId}, ${finding.severity}, ${finding.line}, ${finding.column}, ${finding.message})
          `;
        }
      }
    }

    console.log(`[Neon DB] Recorded audit run ${auditId} (${totalIssues} issues)`);
  } catch (err: any) {
    console.error("[Neon DB] Failed to save audit:", err.message);
  }
}

async function postPRReport(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number,
  commitSha: string,
  results: FileScanResult[]
) {
  const totalIssues = results.reduce((acc, r) => acc + r.findings.length, 0);
  let body = "";

  if (totalIssues === 0) {
    body = `### ✅ CodeGuardians Security Check Passed\n\n` +
      `No security vulnerabilities detected in commit \`${commitSha.slice(0, 7)}\`.\n\n` +
      `_Scanned with AST structural analysis engine._`;
  } else {
    body = `### ⚠️ CodeGuardians Security Audit: ${totalIssues} Issue(s) Detected\n\n` +
      `Static AST inspection flagged security vulnerabilities in commit \`${commitSha.slice(0, 7)}\`:\n\n`;

    for (const fileResult of results) {
      body += `#### 📄 \`${fileResult.filename}\`\n\n`;
      body += `| Severity | Rule | Location | Description |\n`;
      body += `| :--- | :--- | :--- | :--- |\n`;

      for (const finding of fileResult.findings) {
        const badge = getSeverityBadge(finding.severity);
        body += `| ${badge} | \`${finding.ruleId}\` | Line ${finding.line}:${finding.column} | ${finding.message} |\n`;
      }
      body += `\n`;
    }

    body += `> **Action Required:** Fix these issues before merging to protect your codebase.\n\n` +
      `_Report generated autonomously by [CodeGuardians](https://github.com/uzicodes/CodeGuardians)._`;
  }

  await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: pullNumber,
    body,
  });
}
