import { Webhooks } from "@octokit/webhooks";
import { NextRequest, NextResponse } from "next/server";
import { getInstallationOctokit } from "@/lib/github";
import { processPullRequestScan } from "@/lib/scanner-pr";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET?.trim();

  if (!webhookSecret) {
    console.error("[CodeGuardians] Missing GITHUB_WEBHOOK_SECRET in environment.");
    return NextResponse.json(
      { error: "Server misconfiguration: missing webhook secret." },
      { status: 500 }
    );
  }

  const signature = req.headers.get("x-hub-signature-256");
  const event = req.headers.get("x-github-event");
  const id = req.headers.get("x-github-delivery");

  if (!signature || !event || !id) {
    return NextResponse.json(
      { error: "Missing required GitHub webhook headers." },
      { status: 400 }
    );
  }

  const rawBody = await req.text();

  // Instantiate webhooks inside the handler at runtime
  const webhooks = new Webhooks({ secret: webhookSecret });
  const isValid = await webhooks.verify(rawBody, signature);

  if (!isValid) {
    console.warn(`[Security] Invalid webhook signature on delivery: ${id}`);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  console.log(`\n[GitHub Event] ${event} (${payload.action || "no action"})`);

  if (event === "pull_request") {
    const action = payload.action;
    if (["opened", "synchronize", "reopened"].includes(action)) {
      const prNumber = payload.pull_request.number;
      const [owner, repo] = payload.repository.full_name.split("/");
      const commitSha = payload.pull_request.head.sha;
      const installationId = payload.installation?.id;

      if (!installationId) {
        console.error("Missing installation ID in webhook payload.");
        return NextResponse.json({ error: "Missing installation ID" }, { status: 400 });
      }

      console.log(`[Scanning] PR #${prNumber} on ${owner}/${repo} at commit ${commitSha.slice(0, 7)}`);

      // Directly await the scan so serverless contexts do not terminate prematurely
      try {
        const octokit = getInstallationOctokit(installationId);
        await processPullRequestScan(octokit, owner, repo, prNumber, commitSha);
        console.log(`[Scan Complete] PR #${prNumber} on ${owner}/${repo}`);
      } catch (err: any) {
        console.error("[Scan Failure]", err);
        return NextResponse.json(
          { error: "Scan execution failed", details: err.message },
          { status: 500 }
        );
      }
    }
  }

  return NextResponse.json({ received: true });
}
