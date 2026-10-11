import { Octokit } from "octokit";
import { createAppAuth } from "@octokit/auth-app";
import fs from "node:fs";
import path from "node:path";

function getPrivateKey(): string {
  // 1. Direct environment variable (ideal for Vercel)
  if (process.env.GITHUB_PRIVATE_KEY) {
    let key = process.env.GITHUB_PRIVATE_KEY;
    // Handle escaped newlines in env variables
    if (key.includes("\\n")) {
      key = key.replace(/\\n/g, "\n");
    }
    return key;
  }

  // 2. Base64 encoded fallback
  if (process.env.GITHUB_PRIVATE_KEY_BASE64) {
    return Buffer.from(process.env.GITHUB_PRIVATE_KEY_BASE64, "base64").toString("utf-8");
  }

  // 3. Local file path fallback (for local development)
  const keyPath = process.env.GITHUB_PRIVATE_KEY_PATH || "./private-key.pem";
  const resolved = path.resolve(process.cwd(), keyPath);
  if (fs.existsSync(resolved)) {
    return fs.readFileSync(resolved, "utf-8");
  }

  throw new Error("Missing GitHub App private key. Set GITHUB_PRIVATE_KEY or GITHUB_PRIVATE_KEY_BASE64.");
}

export function getInstallationOctokit(installationId: number): Octokit {
  const appId = process.env.GITHUB_APP_ID;
  if (!appId) {
    throw new Error("Missing GITHUB_APP_ID in environment.");
  }

  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId,
      privateKey: getPrivateKey(),
      installationId,
    },
  });
}
