import { sql } from "@/lib/db";
import { ShieldAlert, ShieldCheck, GitPullRequest, Shield } from "lucide-react";

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
      LIMIT 20
    `;
    auditRuns = rows as unknown as AuditRun[];
  } catch (err: any) {
    console.error("Failed to query Neon DB:", err.message);
  }

  const totalAudits = auditRuns.length;
  const vulnerableCount = auditRuns.filter((r) => r.status === "vulnerable").length;
  const cleanCount = auditRuns.filter((r) => r.status === "clean").length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 font-sans">
      <header className="max-w-6xl mx-auto flex items-center justify-between pb-8 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Shield className="w-5 h-5" />
            </span>
            CodeGuardians
          </h1>
          <p className="text-sm text-slate-400 mt-1">Autonomous AST Security & Pull Request Auditing Engine</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Bot Active
        </div>
      </header>

      <main className="max-w-6xl mx-auto mt-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between text-slate-400 text-sm">
              <span>Total PRs Audited</span>
              <GitPullRequest className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-3xl font-bold mt-2 text-white">{totalAudits}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between text-slate-400 text-sm">
              <span>Vulnerabilities Flagged</span>
              <ShieldAlert className="w-4 h-4 text-red-400" />
            </div>
            <div className="text-3xl font-bold mt-2 text-red-400">{vulnerableCount}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between text-slate-400 text-sm">
              <span>Clean Builds Verified</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-bold mt-2 text-emerald-400">{cleanCount}</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-slate-800 font-semibold text-sm text-slate-300">
            Recent Audit Logs
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/50 text-slate-400 uppercase text-xs font-mono">
                <tr>
                  <th className="px-6 py-3">Repository</th>
                  <th className="px-6 py-3">PR</th>
                  <th className="px-6 py-3">Commit</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Findings</th>
                  <th className="px-6 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono text-xs">
                {auditRuns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-500 font-sans">
                      No PR audits recorded yet. Open or push to a pull request to trigger an audit.
                    </td>
                  </tr>
                ) : (
                  auditRuns.map((run) => (
                    <tr key={run.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 text-indigo-300">{run.repo_name}</td>
                      <td className="px-6 py-4 text-white">#{run.pr_number}</td>
                      <td className="px-6 py-4 text-slate-400">{run.commit_sha.slice(0, 7)}</td>
                      <td className="px-6 py-4">
                        {run.status === "clean" ? (
                          <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            CLEAN
                          </span>
                        ) : (
                          <span className="text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                            VULNERABLE
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-200">{run.total_issues}</td>
                      <td className="px-6 py-4 text-slate-400 font-sans">
                        {new Date(run.created_at).toLocaleTimeString()}
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

