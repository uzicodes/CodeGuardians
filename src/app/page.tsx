import { sql } from "@/lib/db";
import {
  ShieldAlert,
  ShieldCheck,
  GitPullRequest,
  Terminal,
  Activity,
  AlertTriangle,
  GitCommit,
  ArrowUpRight,
  Lock,
  Cpu,
  Zap,
  CheckCircle2,
  FolderGit2,
  ExternalLink,
} from "lucide-react";
import Image from "next/image";

export const revalidate = 0;

interface AuditRun {
  id: string;
  repo_name: string;
  pr_number: number;
  commit_sha: string;
  status: "clean" | "vulnerable" | "failed";
  total_issues: number;
  created_at: string;
}

export default async function DashboardPage() {
  let auditRuns: AuditRun[] = [];

  try {
    const rows = await sql`
      SELECT id, repo_name, pr_number, commit_sha, status, total_issues, created_at
      FROM audit_runs
      ORDER BY created_at DESC
      LIMIT 25
    `;
    auditRuns = rows as unknown as AuditRun[];
  } catch (err: any) {
    console.error("Failed to query Neon DB:", err.message);
  }

  const totalAudits = auditRuns.length;
  const vulnerableCount = auditRuns.filter((r) => r.status === "vulnerable").length;
  const cleanCount = auditRuns.filter((r) => r.status === "clean").length;
  const totalIssuesFound = auditRuns.reduce((acc, r) => acc + (r.total_issues || 0), 0);
  const healthScore = totalAudits > 0 ? Math.round((cleanCount / totalAudits) * 100) : 100;

  return (
    <div className="min-h-screen bg-[#FCECD8] text-[#6E3511] font-sans selection:bg-[#597928] selection:text-[#FCECD8] pb-20">
      {/* Top Navbar: Forest Green Surface (#597928) with Brown & Sage Accents */}
      <nav className="border-b border-[#91AC67]/40 bg-[#597928] sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3.5">
            <Image
              src="/favicon/android-chrome-192x192.png"
              alt="CodeGuardians Logo"
              width={40}
              height={40}
              className="w-10 h-10 object-contain drop-shadow-sm"
              priority
            />

            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-[#FCECD8] tracking-tight">CodeGuardians</span>
              </div>
              <p className="text-[11px] text-[#FCECD8]/85 font-medium">Autonomous PR Guardrail Engine</p>
            </div>
          </div>

          {/* Right Status Actions */}
          <div className="flex items-center gap-3">

            <a
              href="https://github.com/apps/codeguardians-security-bot/installations/new"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[#FCECD8] hover:text-white bg-[#6E3511] hover:bg-[#597928] border border-[#91AC67]/40 px-3 py-1.5 rounded-lg transition-colors font-medium shadow-sm"
            >
              <FolderGit2 className="w-3.5 h-3.5 text-[#FCECD8]" />
              <span>Install GitHub App</span>
              <ArrowUpRight className="w-3 h-3 text-[#FCECD8]" />
            </a>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {/* Hero Banner Header: Deep Brown (#6E3511) & Forest Green (#597928) against Cream (#FCECD8) */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-[#597928]/30">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#6E3511] tracking-tight">
              Security Telemetry & Audits
            </h1>
            <p className="text-sm text-[#597928] mt-1 max-w-2xl leading-relaxed font-semibold">
              Real-time abstract syntax tree analysis detecting hardcoded secrets, unsafe string evaluations, and sensitive environment leaks on every GitHub Pull Request.
            </p>
          </div>

          {/* Active Inspection Rules Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium px-2.5 py-1 rounded-md bg-[#597928] text-[#FCECD8] border border-[#91AC67] shadow-sm">
              <Lock className="w-3 h-3 text-[#FCECD8]" /> Secret Scan
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium px-2.5 py-1 rounded-md bg-[#597928] text-[#FCECD8] border border-[#91AC67] shadow-sm">
              <AlertTriangle className="w-3 h-3 text-[#FCECD8]" /> Unsafe Eval
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium px-2.5 py-1 rounded-md bg-[#597928] text-[#FCECD8] border border-[#91AC67] shadow-sm">
              <Zap className="w-3 h-3 text-[#FCECD8]" /> Env Leaks
            </span>
          </div>
        </div>

        {/* 4 Metric Telemetry Cards: Clear Glassmorphism Surfaces */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total PRs Audited */}
          <div className="rounded-2xl bg-white/45 backdrop-blur-xl border border-white/75 p-5 shadow-lg shadow-[#6E3511]/5 transition-all hover:bg-white/55">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#6E3511] uppercase tracking-wider">
                Audited PRs
              </span>
              <div className="p-2 rounded-xl bg-white/70 text-[#597928] border border-white/80 shadow-xs">
                <GitPullRequest className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#6E3511] tracking-tight">{totalAudits}</span>
              <span className="text-xs text-[#597928] font-mono font-medium">runs recorded</span>
            </div>
            <p className="text-[11px] text-[#597928] mt-2 flex items-center gap-1 font-semibold">
              <Activity className="w-3 h-3 text-[#597928]" /> Real-time webhook queue
            </p>
          </div>

          {/* Card 2: Vulnerabilities Flagged */}
          <div className="rounded-2xl bg-white/45 backdrop-blur-xl border border-white/75 p-5 shadow-lg shadow-[#6E3511]/5 transition-all hover:bg-white/55">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#6E3511] uppercase tracking-wider">
                Flagged PRs
              </span>
              <div className="p-2 rounded-xl bg-red-100/80 text-red-600 border border-red-200/90 shadow-xs">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-red-700 tracking-tight">{vulnerableCount}</span>
              <span className="text-xs text-red-700/85 font-mono font-semibold">
                ({totalIssuesFound} violations)
              </span>
            </div>
            <p className="text-[11px] text-[#597928] mt-2 font-semibold">
              Direct review comments posted
            </p>
          </div>

          {/* Card 3: Clean PRs Verified */}
          <div className="rounded-2xl bg-white/45 backdrop-blur-xl border border-white/75 p-5 shadow-lg shadow-[#6E3511]/5 transition-all hover:bg-white/55">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#6E3511] uppercase tracking-wider">
                Clean Builds
              </span>
              <div className="p-2 rounded-xl bg-emerald-100/80 text-[#597928] border border-emerald-200/90 shadow-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#597928] tracking-tight">{cleanCount}</span>
              <span className="text-xs text-[#597928] font-mono font-semibold">passed</span>
            </div>
            <p className="text-[11px] text-[#597928] mt-2 font-semibold">
              Zero security smells detected
            </p>
          </div>

          {/* Card 4: Health Score */}
          <div className="rounded-2xl bg-white/45 backdrop-blur-xl border border-white/75 p-5 shadow-lg shadow-[#6E3511]/5 transition-all hover:bg-white/55">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#6E3511] uppercase tracking-wider">
                Pass Rate
              </span>
              <div className="p-2 rounded-xl bg-white/70 text-[#597928] border border-white/80 shadow-xs">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#597928] tracking-tight">
                {healthScore}%
              </span>
              <span className="text-xs text-[#6E3511]/80 font-mono font-medium">clean ratio</span>
            </div>
            {/* Visual mini-bar */}
            <div className="w-full bg-white/70 border border-white/90 rounded-full h-1.5 mt-3 overflow-hidden">
              <div
                className="bg-[#597928] h-full rounded-full transition-all duration-500"
                style={{ width: `${healthScore}%` }}
              />
            </div>
          </div>
        </div>

        {/* Audit Runs Table Section: Forest Green (#597928) with Brown (#6E3511) & Sage (#91AC67) */}
        <div className="rounded-2xl border border-[#91AC67] bg-[#597928] overflow-hidden shadow-xl">
          {/* Table Header Bar: Warm Chestnut Brown (#6E3511) Accent */}
          <div className="px-6 py-4 border-b border-[#91AC67]/40 bg-[#6E3511] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-[#597928] text-[#FCECD8] border border-[#91AC67]/40">
                <Terminal className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-[#FCECD8]">Audit Stream</h3>
                <p className="text-xs text-[#FCECD8]/85 font-medium">Latest pull request security evaluations</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-[#FCECD8]">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#91AC67]" />
              <span>Storage: Neon Serverless PostgreSQL</span>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[#FCECD8]">
              <thead className="bg-[#597928] text-white uppercase text-[11px] font-mono border-b border-[#91AC67] tracking-wider font-bold">
                <tr>
                  <th className="px-6 py-3.5 text-white font-bold">Repository</th>
                  <th className="px-6 py-3.5 text-white font-bold">Pull Request</th>
                  <th className="px-6 py-3.5 text-white font-bold">Commit SHA</th>
                  <th className="px-6 py-3.5 text-white font-bold">Status</th>
                  <th className="px-6 py-3.5 text-center text-white font-bold">Issues</th>
                  <th className="px-6 py-3.5 text-right text-white font-bold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#91AC67]/30 text-xs font-mono">
                {auditRuns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center font-sans">
                      <div className="max-w-sm mx-auto flex flex-col items-center">
                        <div className="h-12 w-12 rounded-2xl bg-[#6E3511] border border-[#91AC67]/40 flex items-center justify-center text-[#FCECD8] mb-3">
                          <GitPullRequest className="w-6 h-6" />
                        </div>
                        <h4 className="text-base font-semibold text-[#FCECD8]">No PR Audits Recorded Yet</h4>
                        <p className="text-xs text-[#FCECD8]/90 mt-1 text-center leading-relaxed font-medium">
                          Once the CodeGuardians GitHub App is installed on your repository, open or push to a Pull Request to view automated AST telemetry here.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  auditRuns.map((run) => (
                    <tr
                      key={run.id}
                      className="hover:bg-[#6E3511]/30 transition-colors group"
                    >
                      {/* Repo */}
                      <td className="px-6 py-4 font-semibold text-white">
                        <a
                          href={run.repo_name.startsWith("http") ? run.repo_name : `https://github.com/${run.repo_name.replace(/^github\.com\//, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-[#FCECD8] hover:text-white hover:underline transition-colors group/link cursor-pointer"
                        >
                          <FolderGit2 className="w-3.5 h-3.5 text-[#FCECD8] group-hover/link:text-white transition-colors" />
                          <span>{run.repo_name}</span>
                          <ExternalLink className="w-3 h-3 opacity-70 group-hover/link:opacity-100 transition-opacity" />
                        </a>
                      </td>

                      {/* PR Number */}
                      <td className="px-6 py-4">
                        <a
                          href={`https://github.com/${run.repo_name.replace(/^https?:\/\/github\.com\//, "").replace(/^github\.com\//, "")}/pull/${run.pr_number}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#6E3511] hover:bg-[#6E3511]/80 text-[#FCECD8] hover:text-white border border-[#91AC67]/40 hover:border-[#91AC67] font-sans font-medium text-xs hover:underline transition-all group/pr cursor-pointer shadow-sm"
                        >
                          <span>PR #{run.pr_number}</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-70 group-hover/pr:opacity-100 transition-opacity" />
                        </a>
                      </td>

                      {/* Commit SHA */}
                      <td className="px-6 py-4">
                        <a
                          href={`https://github.com/${run.repo_name.replace(/^https?:\/\/github\.com\//, "").replace(/^github\.com\//, "")}/commit/${run.commit_sha}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-[11px] bg-[#6E3511] hover:bg-[#6E3511]/80 border border-[#91AC67]/40 hover:border-[#91AC67] px-2.5 py-1 rounded-md text-[#FCECD8] hover:text-white hover:underline transition-all group/commit cursor-pointer shadow-sm"
                        >
                          <GitCommit className="w-3 h-3 text-[#FCECD8]" />
                          <span>{run.commit_sha.slice(0, 7)}</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-70 group-hover/commit:opacity-100 transition-opacity" />
                        </a>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {run.status === "clean" ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-100 bg-[#91AC67]/40 px-2.5 py-1 rounded-full border border-[#91AC67] text-[11px] font-sans font-semibold shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#91AC67]" />
                            Clean
                          </span>
                        ) : run.status === "vulnerable" ? (
                          <span className="inline-flex items-center gap-1.5 text-red-200 bg-red-950/80 px-2.5 py-1 rounded-full border border-red-500/50 text-[11px] font-sans font-semibold shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            Vulnerable
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-amber-200 bg-amber-950/80 px-2.5 py-1 rounded-full border border-amber-500/50 text-[11px] font-sans font-semibold shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            Failed
                          </span>
                        )}
                      </td>

                      {/* Issues */}
                      <td className="px-6 py-4 text-center">
                        {run.total_issues > 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded bg-red-950/80 text-red-300 font-bold border border-red-500/50">
                            {run.total_issues}
                          </span>
                        ) : (
                          <span className="text-[#FCECD8]/80 font-medium">0</span>
                        )}
                      </td>

                      {/* Timestamp */}
                      <td className="px-6 py-4 text-right font-sans text-xs">
                        <div className="flex flex-col items-end">
                          <span className="text-[#FCECD8] font-medium">
                            {new Date(run.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="text-[11px] text-[#FCECD8]/80">
                            {new Date(run.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
