import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import postgres from "postgres";

const DEFAULT_MIGRATIONS_DIRECTORY = path.join(
  process.cwd(),
  "src",
  "db",
  "migrations"
);
const MIGRATION_TABLE = "hvc_schema_migrations";

export async function listMigrationFiles(
  directory = DEFAULT_MIGRATIONS_DIRECTORY
) {
  const entries = await fs.readdir(directory, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) => ({
      name: entry.name.slice(0, -4),
      path: path.join(directory, entry.name)
    }));
}

export async function getMigrationPlan({
  applied = new Set(),
  directory = DEFAULT_MIGRATIONS_DIRECTORY
} = {}) {
  const migrations = await listMigrationFiles(directory);
  return migrations.filter((migration) => !applied.has(migration.name));
}

async function ensureMigrationTable(client) {
  await client.unsafe(`
    CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
      migration_name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT NOW()
    )
  `);
}

export async function runMigrations({
  databaseUrl = process.env.POSTGRES_URL,
  directory = DEFAULT_MIGRATIONS_DIRECTORY
} = {}) {
  if (!databaseUrl) {
    throw new Error("POSTGRES_URL is not configured.");
  }

  const client = postgres(databaseUrl, {
    max: 1,
    prepare: false
  });

  try {
    await ensureMigrationTable(client);
    const rows = await client.unsafe(
      `SELECT migration_name FROM ${MIGRATION_TABLE}`
    );
    const applied = new Set(
      rows
        .map((row) => row.migration_name)
        .filter((name) => typeof name === "string")
    );
    const plan = await getMigrationPlan({ applied, directory });

    for (const migration of plan) {
      const sqlText = await fs.readFile(migration.path, "utf8");

      await client.begin(async (transaction) => {
        await transaction.unsafe(sqlText);
        await transaction`
          INSERT INTO hvc_schema_migrations (migration_name)
          VALUES (${migration.name})
        `;
      });

      console.log(`Applied migration: ${migration.name}`);
    }

    if (plan.length === 0) {
      console.log("No pending migrations.");
    }

    return plan.map((migration) => migration.name);
  } finally {
    await client.end({ timeout: 5 });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runMigrations({
    directory: process.argv[2] ?? DEFAULT_MIGRATIONS_DIRECTORY
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
