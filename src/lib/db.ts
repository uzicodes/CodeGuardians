import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.warn("Missing DATABASE_URL in environment.");
}

export const sql = neon(process.env.DATABASE_URL || "");

