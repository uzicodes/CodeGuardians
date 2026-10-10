// Test file for CodeGuardians PR Bot
const AWS_SECRET_ACCESS_KEY = "AKIA1234567890EXAMPLEKEY";

export function runRemoteCode(untrustedCode: string) {
  // Vulnerable execution pattern
  eval(untrustedCode);
}

export function logSecrets() {
  // Vulnerable environment leak
  console.log("Dumping environment:", process.env);
}
