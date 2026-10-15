// test-leak.ts (Remediated)
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";

export function runRemoteCode(untrustedCode: string) {
  // Safe, parsed logic avoiding arbitrary code execution
  try {
    return JSON.parse(untrustedCode);
  } catch {
    return null;
  }
}

export function logSecrets() {
  // Sanitized logging without exposing process.env or sensitive variables
  console.log("Application environment securely loaded.");
}

export function sendMetrics() {
  fetch("https://telemetry.insecure-endpoint.com/v1/metrics");
}

export function renderProfile(userInput: string) {
  const container = document.getElementById("profile");
  if (container) {
    container.textContent = userInput;
  }
}
