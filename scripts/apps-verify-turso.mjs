import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { prepareBackupApps } from "./lib/apps-import-backup-preparation.mjs";
import {
  compareTursoApps,
  createTursoClient,
  normalizeTursoApp,
  readTursoApps
} from "./lib/turso-apps.mjs";
import { runTursoMigrations } from "./lib/turso-schema.mjs";

export async function runTursoVerification({
  backupPath,
  databaseUrl = process.env.TURSO_DATABASE_URL,
  authToken = process.env.TURSO_AUTH_TOKEN,
  client: providedClient
} = {}) {
  if (!backupPath) throw new Error("A backupPath is required.");
  const payload = JSON.parse(await fs.readFile(backupPath, "utf8"));
  if (payload?.scope !== "admin") {
    throw new Error(
      "Only an admin JSON backup can be verified. Download a fresh backup from the protected admin page."
    );
  }
  const sourceApps = prepareBackupApps(payload).map(normalizeTursoApp);
  const client = providedClient ?? createTursoClient({ databaseUrl, authToken });

  await runTursoMigrations({ client });
  const targetApps = await readTursoApps({ client });
  const result = compareTursoApps(sourceApps, targetApps);
  console.log(JSON.stringify(result, null, 2));

  if (!result.ok) process.exitCode = 1;
  return result;
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  const backupPath = process.argv[2];
  runTursoVerification({ backupPath }).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
