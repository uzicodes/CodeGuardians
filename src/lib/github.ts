import { Octokit } from "octokit";
import { createAppAuth } from "@octokit/auth-app";
import fs from "node:fs";
import path from "node:path";

function getPrivateKey(): string {
  const keyPath = process.env.GITHUB_PRIVATE_KEY_PATH || "./private-key.pem";
  const resolved = path.resolve(process.cwd(), keyPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Private key file not found at ${resolved}`);
  }
  return fs.readFileSync(resolved, "utf-8");
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

