import { Octokit } from "octokit";
import { analyzeSource } from "../analyzer";
import { Finding } from "../types";

const SCANNABLE_EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

interface FileScanResult {
  filename: string;
  findings: Finding[];
}

export async function processPullRequestScan(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number,
  commitSha: string
) {
  // 1. Fetch changed files in the Pull Request
  const { data: files } = await octokit.rest.pulls.listFiles({
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100,
  });

  const scanResults: FileScanResult[] = [];

  for (const file of files) {
    // Only inspect modified or added JS/TS files
    if (!SCANNABLE_EXTENSIONS.test(file.filename) || file.status === "removed") {
      continue;
    }

    try {
      // 2. Fetch raw file contents at this commit
      const { data: fileBlob } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: file.filename,
        ref: commitSha,
      });

      if (!("content" in fileBlob) || !fileBlob.content) {
        continue;
      }

      const rawCode = Buffer.from(fileBlob.content, "base64").toString("utf-8");

      // 3. Run AST security engine
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

  // 4. Post comment to Pull Request
  await postPRReport(octokit, owner, repo, pullNumber, commitSha, scanResults);
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
    body = `###  CodeGuardians Security Check Passed\n\n` +
      `No security smells or hardcoded secrets detected in commit \`${commitSha.slice(0, 7)}\`.\n\n` +
      `_Scanned with AST structural analysis engine._`;
  } else {
    body = `### ⚠️ CodeGuardians Security Audit: ${totalIssues} Issue(s) Detected\n\n` +
      `Static AST inspection flagged security vulnerabilities in commit \`${commitSha.slice(0, 7)}\`:\n\n`;

    for (const fileResult of results) {
      body += `#### 📄 \`${fileResult.filename}\`\n\n`;
      body += `| Severity | Rule | Location | Description |\n`;
      body += `| :--- | :--- | :--- | :--- |\n`;

      for (const finding of fileResult.findings) {
        const badge = finding.severity === "critical" ? "🔴 **CRITICAL**" : "🟠 **HIGH**";
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

  console.log(`[CodeGuardians] Security review successfully posted to PR #${pullNumber}`);
}
