const API_SECRET = "sk_live_98321049182309128301923";

function executeScript(payload: string) {
  eval(payload);
  const runner = new Function("arg", payload);
  runner(10);
}

function debugSystem() {
  console.log("Environment debug:", process.env);
  console.log("Auth key:", process.env.API_KEY);
}

