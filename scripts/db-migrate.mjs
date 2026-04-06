import fs from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const databaseUrl = process.env.POSTGRES_URL;

if (!databaseUrl) {
  throw new Error("POSTGRES_URL is not configured.");
}

const sqlFilePath =
  process.argv[2] ??
  path.join(process.cwd(), "src", "db", "migrations", "0000_chemical_morph.sql");
const sqlText = await fs.readFile(sqlFilePath, "utf8");
const client = postgres(databaseUrl, {
  max: 1,
  prepare: false
});

try {
  await client.unsafe(sqlText);
  console.log(`Applied migration: ${sqlFilePath}`);
} finally {
  await client.end({ timeout: 5 });
}
