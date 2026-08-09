import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { prepareBackupApps } from "./lib/apps-import-backup-preparation.mjs";
import {
  createTursoClient,
  normalizeTursoApp,
  toTursoInsertStatement
} from "./lib/turso-apps.mjs";
import { runTursoMigrations } from "./lib/turso-schema.mjs";

function parseOptions(args) {
  const options = { backupPath: null, allowNonEmpty: false };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--backup") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("Usage: --backup <backup.json>");
      }
      options.backupPath = value;
      index += 1;
      continue;
    }
    if (arg === "--allow-non-empty") {
      options.allowNonEmpty = true;
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }

  if (!options.backupPath) {
    throw new Error(
      "Usage: npm run apps:import:backup:turso -- --backup <backup.json>"
    );
  }

  return options;
}

export async function runTursoBackupImport({
  backupPath,
  databaseUrl = process.env.TURSO_DATABASE_URL,
  authToken = process.env.TURSO_AUTH_TOKEN,
  allowNonEmpty = false,
  client: providedClient
} = {}) {
  if (!backupPath) throw new Error("A backupPath is required.");
  const raw = await fs.readFile(backupPath, "utf8");
  const payload = JSON.parse(raw);
  if (payload?.scope !== "admin") {
    throw new Error(
      "Only an admin JSON backup can be imported. Download a fresh backup from the protected admin page."
    );
  }
  const preparedApps = prepareBackupApps(payload);
  const apps = preparedApps.map((app, index) => normalizeTursoApp(app, index));
  const ids = new Set();

  for (const app of apps) {
    if (ids.has(app.id)) throw new Error(`Backup contains duplicate app id: ${app.id}`);
    ids.add(app.id);
  }

  const client = providedClient ?? createTursoClient({ databaseUrl, authToken });
  await runTursoMigrations({ client });
  const countResult = await client.execute({
    sql: "SELECT COUNT(*) AS count FROM apps",
    args: []
  });
  const count = Number(countResult.rows[0]?.count ?? 0);

  if (count > 0 && !allowNonEmpty) {
    throw new Error(
      "Turso apps table is not empty. Stop here and verify a fresh backup before importing."
    );
  }

  const statements = apps.map((app) =>
    toTursoInsertStatement(app, { upsert: allowNonEmpty })
  );
  if (statements.length > 0) await client.batch(statements, "write");

  console.log(`Imported ${apps.length} apps into Turso from ${backupPath}`);
  return { imported: apps.length, previousCount: count };
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  runTursoBackupImport(parseOptions(process.argv.slice(2))).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
