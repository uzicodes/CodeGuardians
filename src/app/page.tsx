import { sql } from "@/lib/db";
import { ShieldAlert, ShieldCheck, GitPullRequest, Shield, Terminal, ExternalLink, Activity } from "lucide-react";

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Top Banner */}
      <nav className="border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shadow-inner">
              <Shield className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <span className="font-bold text-white tracking-tight">CodeGuardians</span>
              <span className="ml-2 text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/50">
                AST Engine v1.0
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Bot Active (Vercel)
            </span>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-6 mt-8 space-y-8">
        {/* Hero Section */}
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight sm:text-3xl">
            Vulnerability Telemetry
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Real-time static abstract syntax tree (AST) inspection logs across your integrated repositories.
          </p>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
              <span>Audited Pull Requests</span>
              <GitPullRequest className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-3xl font-extrabold mt-3 text-white tracking-tight">{totalAudits}</div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <Activity className="w-3 h-3 text-indigo-400" /> Webhook event synchronization
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
              <span>Vulnerable PRs Flagged</span>
              <ShieldAlert className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-3xl font-extrabold mt-3 text-red-400 tracking-tight">{vulnerableCount}</div>
            <div className="text-xs text-slate-500 mt-1">Direct PR review comments dispatched</div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
              <span>Clean Builds Verified</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-extrabold mt-3 text-emerald-400 tracking-tight">{cleanCount}</div>
            <div className="text-xs text-slate-500 mt-1">Zero critical security smells detected</div>
          </div>
        </div>

        {/* Audit Runs Table */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-lg backdrop-blur-sm">
          <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
            <div className="font-semibold text-sm text-slate-200 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-slate-400" />
              Recent Pull Request Audits
            </div>
            <span className="text-xs font-mono text-slate-400">Database: Neon PostgreSQL</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/70 text-slate-400 uppercase text-[11px] font-mono border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Repository</th>
                  <th className="px-6 py-3.5">Pull Request</th>
                  <th className="px-6 py-3.5">Commit SHA</th>
                  <th className="px-6 py-3.5">Security Status</th>
                  <th className="px-6 py-3.5 text-center">Issues</th>
                  <th className="px-6 py-3.5 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {auditRuns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-sans">
                      No PR audits recorded yet. Open or push to a pull request to trigger the bot.
                    </td>
                  </tr>
                ) : (
                  auditRuns.map((run) => (
                    <tr key={run.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 font-semibold text-indigo-300">
                        {run.repo_name}
                      </td>
                      <td className="px-6 py-4 text-white">
                        <span className="inline-flex items-center gap-1 font-sans font-medium">
                          PR #{run.pr_number}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        <span className="bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
                          {run.commit_sha.slice(0, 7)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {run.status === "clean" ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 text-[11px] font-sans font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Clean
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20 text-[11px] font-sans font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                            Vulnerable
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-200">
                        {run.total_issues > 0 ? (
                          <span className="text-red-400">{run.total_issues}</span>
                        ) : (
                          <span className="text-slate-500">0</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400 font-sans text-xs">
                        {new Date(run.created_at).toLocaleDateString()} {new Date(run.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
