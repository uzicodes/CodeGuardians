import { Webhooks } from "@octokit/webhooks";
import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

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

  // Verify HMAC SHA-256 signature
  const isValid = await webhooks.verify(rawBody, signature);
  if (!isValid) {
    console.warn(`[Security] Invalid webhook signature on delivery: ${id}`);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  console.log(`\n[GitHub Event] Received: ${event} (action: ${payload.action || "none"})`);

  if (event === "pull_request") {
    const action = payload.action;
    if (["opened", "synchronize", "reopened"].includes(action)) {
      console.log(`[Target PR] #${payload.pull_request.number} on ${payload.repository.full_name}`);
      console.log(`[Commit SHA] ${payload.pull_request.head.sha}`);
    }
  }

  return NextResponse.json({ received: true });
}
