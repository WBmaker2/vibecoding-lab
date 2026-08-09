import { pathToFileURL } from "node:url";
import { getConfiguredDatabaseProvider } from "./lib/database-provider.mjs";
import { createTursoClient } from "./lib/turso-apps.mjs";
import { runTursoMigrations } from "./lib/turso-schema.mjs";

export async function runTursoDatabaseMigrations({
  databaseUrl = process.env.TURSO_DATABASE_URL,
  authToken = process.env.TURSO_AUTH_TOKEN
} = {}) {
  const provider = getConfiguredDatabaseProvider({
    tursoDatabaseUrl: databaseUrl,
    tursoAuthToken: authToken,
    postgresUrl: undefined
  });

  if (provider !== "turso") {
    throw new Error(
      "Turso migration requires TURSO_DATABASE_URL and TURSO_AUTH_TOKEN."
    );
  }

  const client = createTursoClient({ databaseUrl, authToken });
  return runTursoMigrations({ client });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  runTursoDatabaseMigrations().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
