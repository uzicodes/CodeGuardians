// Test file for CodeGuardians PR Bot
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

// 1. Insecure transport
fetch("http://api.external-service.com/v1/telemetry");

// 2. DOM XSS
const container = document.getElementById("app");
if (container) {
  container.innerHTML = "<div>" + location.search + "</div>";
}

