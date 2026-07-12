import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import postgres from "postgres";
import { verifyStaticGallerySnapshot } from "./lib/static-gallery-verifier.mjs";

const REPO_ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const SNAPSHOT_PATH = path.join(REPO_ROOT, "src", "data", "public-apps.json");
const THUMBNAIL_DIR = path.join(REPO_ROOT, "public", "app-thumbnails");

function normalizeDateValue(value) {
  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
}

function coerceText(value) {
  return typeof value === "string" ? value : "";
}

function coerceNullableText(value) {
  return value == null ? null : coerceText(value);
}

function coerceTags(value) {
  return Array.isArray(value)
    ? value.filter((tag) => typeof tag === "string")
    : [];
}

function normalizeThumbnailMode(value) {
  return ["auto", "upload", "placeholder"].includes(value)
    ? value
    : "placeholder";
}

function toPublicSnapshotApp(raw, index) {
  return {
    id: coerceText(raw.id) || `app-${index + 1}`,
    title: coerceText(raw.title),
    summary: coerceText(raw.summary),
    url: coerceText(raw.url),
    githubUrl: coerceNullableText(raw.githubUrl),
    tags: coerceTags(raw.tags),
    thumbnailMode: normalizeThumbnailMode(raw.thumbnailMode),
    thumbnailUrl: coerceNullableText(raw.thumbnailUrl),
    subject: coerceNullableText(raw.subject),
    grade: coerceNullableText(raw.grade),
    memo: coerceNullableText(raw.memo),
    createdAt: normalizeDateValue(raw.createdAt),
    updatedAt: normalizeDateValue(raw.updatedAt)
  };
}

async function fetchAppsFromPostgres(databaseUrl) {
  const sql = postgres(databaseUrl, { prepare: false });

  try {
    const rows = await sql`
      select
        id,
        title,
        summary,
        url,
        github_url as "githubUrl",
        tags,
        thumbnail_mode as "thumbnailMode",
        thumbnail_url as "thumbnailUrl",
        subject,
        grade,
        memo,
        created_at as "createdAt",
        updated_at as "updatedAt"
      from apps
      order by updated_at desc, created_at desc
    `;

    return rows.map((row, index) => toPublicSnapshotApp(row, index));
  } finally {
    await sql.end({ timeout: 5 });
  }
}

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
  snapshotPath = SNAPSHOT_PATH,
  thumbnailDir = THUMBNAIL_DIR
} = {}) {
  if (!databaseUrl) {
    throw new Error("POSTGRES_URL is not configured.");
  }

  const [dbApps, snapshot] = await Promise.all([
    fetchAppsFromPostgres(databaseUrl),
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
