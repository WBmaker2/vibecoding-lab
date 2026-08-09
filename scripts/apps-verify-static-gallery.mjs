import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { fetchAppsFromConfiguredDatabase } from "./lib/apps-database.mjs";
import { verifyStaticGallerySnapshot } from "./lib/static-gallery-verifier.mjs";

const REPO_ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const SNAPSHOT_PATH = path.join(REPO_ROOT, "src", "data", "public-apps.json");
const THUMBNAIL_DIR = path.join(REPO_ROOT, "public", "app-thumbnails");

async function readSnapshot(snapshotPath) {
  const snapshot = JSON.parse(await fs.readFile(snapshotPath, "utf8"));

  if (!snapshot || typeof snapshot !== "object") {
    throw new Error("Static gallery snapshot must be an object.");
  }

  if (snapshot.version !== 1) {
    throw new Error("Static gallery snapshot must use version 1.");
  }

  if (!Array.isArray(snapshot.apps)) {
    throw new Error("Static gallery snapshot must include an apps array.");
  }

  if (snapshot.appCount !== snapshot.apps.length) {
    throw new Error("Static gallery snapshot appCount does not match apps.");
  }

  return snapshot;
}

export async function runStaticGalleryVerification({
  databaseUrl = process.env.POSTGRES_URL,
  tursoDatabaseUrl = process.env.TURSO_DATABASE_URL,
  authToken = process.env.TURSO_AUTH_TOKEN,
  snapshotPath = SNAPSHOT_PATH,
  thumbnailDir = THUMBNAIL_DIR
} = {}) {
  const [dbApps, snapshot] = await Promise.all([
    fetchAppsFromConfiguredDatabase({
      databaseUrl,
      tursoDatabaseUrl,
      authToken
    }),
    readSnapshot(snapshotPath)
  ]);
  const result = await verifyStaticGallerySnapshot({
    dbApps,
    snapshot,
    thumbnailDir
  });

  console.log(JSON.stringify(result, null, 2));

  if (!result.ok) {
    process.exitCode = 1;
  }

  return result;
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  runStaticGalleryVerification().catch((error) => {
    console.error(
      `[error] unable to verify static gallery: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    process.exitCode = 1;
  });
}
