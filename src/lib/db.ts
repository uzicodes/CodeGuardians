import { neon } from "@neondatabase/serverless";

let dbUrl = process.env.DATABASE_URL?.trim() || "";

if (
  (dbUrl.startsWith('"') && dbUrl.endsWith('"')) ||
  (dbUrl.startsWith("'") && dbUrl.endsWith("'"))
) {
  dbUrl = dbUrl.slice(1, -1).trim();
}

if (!dbUrl) {
  console.warn("[CodeGuardians] Missing DATABASE_URL in environment.");
}

export const sql = neon(dbUrl);
