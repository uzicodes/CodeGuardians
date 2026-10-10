import { Webhooks } from "@octokit/webhooks";
import { NextRequest, NextResponse } from "next/server";
import { getInstallationOctokit } from "@/lib/github";
import { processPullRequestScan } from "@/lib/scanner-pr";

const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || "";
const webhooks = new Webhooks({ secret: webhookSecret });

export async function POST(req: NextRequest) {
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

      // Trigger the automated audit asynchronously
      (async () => {
        try {
          const octokit = getInstallationOctokit(installationId);
          await processPullRequestScan(octokit, owner, repo, prNumber, commitSha);
        } catch (err: any) {
          console.error("[Scan Failure]", err);
        }
      })();
    }
  }

  return NextResponse.json({ received: true });
}
