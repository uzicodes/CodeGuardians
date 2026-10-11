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
    <div className="min-h-screen bg-[#070b16] text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 pb-20">
      {/* Top Navbar */}
      <nav className="border-b border-white/[0.08] bg-[#070b16] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-[#0d1222] border border-white/10 flex items-center justify-center overflow-hidden p-1.5 shadow-sm">
                <Image
                  src="/favicon/android-chrome-192x192.png"
                  alt="CodeGuardians Logo"
                  width={32}
                  height={32}
                  className="w-full h-full object-contain rounded-lg"
                  priority
                />
              </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-white tracking-tight">CodeGuardians</span>
                <span className="text-[10px] uppercase font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 tracking-wider">
                  v1.2 AST
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Autonomous PR Guardrail Engine</p>
            </div>
          </div>

          {/* Right Status Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-full shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>Webhooks Live</span>
            </div>

            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 px-3 py-1.5 rounded-lg transition-colors font-medium"
            >
              <FolderGit2 className="w-3.5 h-3.5 text-slate-400" />
              <span>GitHub App</span>
              <ArrowUpRight className="w-3 h-3 text-slate-400" />
            </a>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {/* Hero Banner Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-white/[0.06]">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono font-medium mb-3">
              <Cpu className="w-3 h-3 text-indigo-400" />
              AST Parser: @babel/traverse & parser
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              Security Telemetry & Audits
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Real-time abstract syntax tree analysis detecting hardcoded secrets, unsafe string evaluations, and sensitive environment leaks on every GitHub Pull Request.
            </p>
          </div>

          {/* Active Inspection Rules Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-md bg-slate-900/90 text-slate-300 border border-white/10">
              <Lock className="w-3 h-3 text-amber-400" /> Secret Scan
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-md bg-slate-900/90 text-slate-300 border border-white/10">
              <AlertTriangle className="w-3 h-3 text-red-400" /> Unsafe Eval
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-md bg-slate-900/90 text-slate-300 border border-white/10">
              <Zap className="w-3 h-3 text-cyan-400" /> Env Leaks
            </span>
          </div>
        </div>

        {/* 4 Metric Telemetry Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total PRs Audited */}
          <div className="relative group overflow-hidden rounded-2xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/[0.08] p-5 shadow-lg backdrop-blur-md hover:border-white/20 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Audited PRs
              </span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <GitPullRequest className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white tracking-tight">{totalAudits}</span>
              <span className="text-xs text-slate-400 font-mono">runs recorded</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1 font-medium">
              <Activity className="w-3 h-3 text-indigo-400" /> Real-time webhook queue
            </p>
          </div>

          {/* Card 2: Vulnerabilities Flagged */}
          <div className="relative group overflow-hidden rounded-2xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/[0.08] p-5 shadow-lg backdrop-blur-md hover:border-red-500/30 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Flagged PRs
              </span>
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-rose-400 tracking-tight">{vulnerableCount}</span>
              <span className="text-xs text-rose-300/70 font-mono font-medium">
                ({totalIssuesFound} violations)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 font-medium">
              Direct review comments posted
            </p>
          </div>

          {/* Card 3: Clean PRs Verified */}
          <div className="relative group overflow-hidden rounded-2xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/[0.08] p-5 shadow-lg backdrop-blur-md hover:border-emerald-500/30 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Clean Builds
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-emerald-400 tracking-tight">{cleanCount}</span>
              <span className="text-xs text-emerald-400/70 font-mono font-medium">passed</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 font-medium">
              Zero security smells detected
            </p>
          </div>

          {/* Card 4: Health Score */}
          <div className="relative group overflow-hidden rounded-2xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/[0.08] p-5 shadow-lg backdrop-blur-md hover:border-white/20 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Pass Rate
              </span>
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-cyan-400 tracking-tight">
                {healthScore}%
              </span>
              <span className="text-xs text-slate-400 font-mono">clean ratio</span>
            </div>
            {/* Visual mini-bar */}
            <div className="w-full bg-slate-800/80 rounded-full h-1.5 mt-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${healthScore}%` }}
              />
            </div>
          </div>
        </div>

        {/* Audit Runs Table Section */}
        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/50 backdrop-blur-xl overflow-hidden shadow-2xl">
          {/* Table Header Bar */}
          <div className="px-6 py-4 border-b border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/[0.01]">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-slate-800/80 text-slate-300 border border-white/10">
                <Terminal className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-slate-100">Audit Stream</h3>
                <p className="text-xs text-slate-400">Latest pull request security evaluations</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400" />
              <span>Storage: Neon Serverless PostgreSQL</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-[#0b0f1d]/80 text-slate-400 uppercase text-[11px] font-mono border-b border-white/[0.06] tracking-wider">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Repository</th>
                  <th className="px-6 py-3.5 font-semibold">Pull Request</th>
                  <th className="px-6 py-3.5 font-semibold">Commit SHA</th>
                  <th className="px-6 py-3.5 font-semibold">Status</th>
                  <th className="px-6 py-3.5 font-semibold text-center">Issues</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-xs font-mono">
                {auditRuns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center font-sans">
                      <div className="max-w-sm mx-auto flex flex-col items-center">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
                          <GitPullRequest className="w-6 h-6" />
                        </div>
                        <h4 className="text-base font-semibold text-white">No PR Audits Recorded Yet</h4>
                        <p className="text-xs text-slate-400 mt-1 text-center leading-relaxed">
                          Once the CodeGuardians GitHub App is installed on your repository, open or push to a Pull Request to view automated AST telemetry here.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  auditRuns.map((run) => (
                    <tr
                      key={run.id}
                      className="hover:bg-white/[0.03] transition-colors group"
                    >
                      {/* Repo */}
                      <td className="px-6 py-4 font-semibold text-indigo-300">
                        <div className="flex items-center gap-2">
                          <FolderGit2 className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                          <span>{run.repo_name}</span>
                        </div>
                      </td>

                      {/* PR Number */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/[0.04] text-white border border-white/10 font-sans font-medium text-xs">
                          PR #{run.pr_number}
                        </span>
                      </td>

                      {/* Commit SHA */}
                      <td className="px-6 py-4 text-slate-400">
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-slate-950/70 border border-white/[0.08] px-2 py-0.5 rounded-md text-slate-300">
                          <GitCommit className="w-3 h-3 text-slate-500" />
                          {run.commit_sha.slice(0, 7)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {run.status === "clean" ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 text-[11px] font-sans font-medium shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Clean
                          </span>
                        ) : run.status === "vulnerable" ? (
                          <span className="inline-flex items-center gap-1.5 text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20 text-[11px] font-sans font-medium shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            Vulnerable
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 text-[11px] font-sans font-medium shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            Failed
                          </span>
                        )}
                      </td>

                      {/* Issues */}
                      <td className="px-6 py-4 text-center">
                        {run.total_issues > 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-bold border border-rose-500/20">
                            {run.total_issues}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-medium">0</span>
                        )}
                      </td>

                      {/* Timestamp */}
                      <td className="px-6 py-4 text-right text-slate-400 font-sans text-xs">
                        <div className="flex flex-col items-end">
                          <span className="text-slate-300">
                            {new Date(run.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="text-[11px] text-slate-500">
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

        {/* System Diagnostics Footer */}
        <div className="rounded-xl border border-white/[0.06] bg-slate-900/30 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-slate-300 font-medium">AST Security Engine: Operational</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500">
            <span>Next.js App Router (Turbopack)</span>
            <span>•</span>
            <span>Babel Parser Core</span>
            <span>•</span>
            <span>Neon Serverless</span>
          </div>
        </div>
      </main>
    </div>
  );
}
