import { createClient } from "@libsql/client";
import { getTursoConfig } from "./database-provider.mjs";

const MIGRATION_TABLE = "hvc_schema_migrations";

export const TURSO_MIGRATIONS = [
  {
    name: "0000_apps",
    statements: [
      `
        CREATE TABLE IF NOT EXISTS apps (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          summary TEXT NOT NULL,
          url TEXT NOT NULL,
          github_url TEXT,
          tags TEXT NOT NULL,
          thumbnail_mode TEXT NOT NULL,
          thumbnail_url TEXT,
          subject TEXT,
          grade TEXT,
          memo TEXT,
          subjects TEXT,
          grade_bands TEXT,
          audience TEXT,
          interaction_type TEXT,
          learning_process TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `,
      "CREATE INDEX IF NOT EXISTS apps_updated_at_idx ON apps (updated_at DESC, created_at DESC)"
    ]
  },
  {
    name: "0001_static_gallery_sync_leases",
    statements: [
      `
        CREATE TABLE IF NOT EXISTS static_gallery_sync_leases (
          lease_key TEXT PRIMARY KEY NOT NULL,
          lease_token TEXT NOT NULL,
          marker_id TEXT NOT NULL,
          requested_at TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          previous_run_id INTEGER,
          run_id INTEGER
        )
      `,
      "CREATE INDEX IF NOT EXISTS static_gallery_sync_leases_marker_idx ON static_gallery_sync_leases (marker_id, requested_at)"
    ]
  },
  {
    name: "0002_app_catalog_state",
    statements: [
      `
        CREATE TABLE IF NOT EXISTS app_catalog_state (
          state_key TEXT PRIMARY KEY NOT NULL,
          revision INTEGER NOT NULL DEFAULT 0
        )
      `,
      `
        INSERT INTO app_catalog_state (state_key, revision)
        VALUES ('apps', 0)
        ON CONFLICT (state_key) DO NOTHING
      `
    ]
  }
];

export async function runTursoMigrations({
  databaseUrl,
  authToken,
  client: providedClient
} = {}) {
  const client = providedClient ?? createClient(getTursoConfig({ databaseUrl, authToken }));

  await client.execute({
    sql: `
      CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
        migration_name TEXT PRIMARY KEY NOT NULL,
        applied_at TEXT NOT NULL
      )
    `,
    args: []
  });

  const result = await client.execute({
    sql: `SELECT migration_name FROM ${MIGRATION_TABLE}`,
    args: []
  });
  const applied = new Set(
    result.rows
      .map((row) => row.migration_name)
      .filter((name) => typeof name === "string")
  );
  const pending = TURSO_MIGRATIONS.filter(({ name }) => !applied.has(name));

  for (const migration of pending) {
    const now = new Date().toISOString();
    await client.batch(
      [
        ...migration.statements.map((sql) => ({ sql, args: [] })),
        {
          sql: `INSERT INTO ${MIGRATION_TABLE} (migration_name, applied_at) VALUES (?, ?)`,
          args: [migration.name, now]
        }
      ],
      "write"
    );
    console.log(`Applied Turso migration: ${migration.name}`);
  }

  if (pending.length === 0) {
    console.log("No pending Turso migrations.");
  }

  return pending.map(({ name }) => name);
}
