import fs from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const SNAPSHOT_PATH = path.join(process.cwd(), "src", "data", "public-apps.json");
const PUBLIC_DIR = path.join(process.cwd(), "public");
const LOCAL_THUMBNAIL_PREFIX = "/app-thumbnails/";

const COMPARED_FIELDS = [
  "title",
  "summary",
  "url",
  "githubUrl",
  "tags",
  "thumbnailMode",
  "subject",
  "grade",
  "memo",
  "createdAt",
  "updatedAt"
];

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

async function fetchAppsFromPostgres() {
  const databaseUrl = process.env.POSTGRES_URL;

  if (!databaseUrl) {
    throw new Error("POSTGRES_URL is not configured.");
  }

  const sql = postgres(databaseUrl, {
    prepare: false
  });

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
      order by
        updated_at desc,
        created_at desc
    `;

    return rows.map((row, index) => toPublicSnapshotApp(row, index));
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function readSnapshot() {
  const raw = await fs.readFile(SNAPSHOT_PATH, "utf8");
  const snapshot = JSON.parse(raw);

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

function stableJson(value) {
  return JSON.stringify(value);
}

function findFieldMismatches(dbApp, snapshotApp) {
  const fields = [];

  for (const field of COMPARED_FIELDS) {
    if (stableJson(dbApp[field]) !== stableJson(snapshotApp[field])) {
      fields.push(field);
    }
  }

  return fields;
}

function classifyThumbnail(thumbnailUrl) {
  if (!thumbnailUrl) {
    return "null";
  }

  if (typeof thumbnailUrl !== "string") {
    return "other";
  }

  if (thumbnailUrl.startsWith(LOCAL_THUMBNAIL_PREFIX)) {
    return "local";
  }

  if (/^https?:\/\//i.test(thumbnailUrl) || thumbnailUrl.startsWith("//")) {
    return "remote";
  }

  return "other";
}

function getThumbnailStats(apps) {
  return apps.reduce(
    (stats, app) => {
      const category = classifyThumbnail(app.thumbnailUrl);
      stats[category] += 1;
      return stats;
    },
    {
      local: 0,
      remote: 0,
      null: 0,
      other: 0
    }
  );
}

function getLocalThumbnailPath(thumbnailUrl) {
  if (typeof thumbnailUrl !== "string") {
    return null;
  }

  if (!thumbnailUrl.startsWith(LOCAL_THUMBNAIL_PREFIX)) {
    return null;
  }

  const parsed = new URL(thumbnailUrl, "https://static.local");
  const decodedPath = decodeURIComponent(parsed.pathname);
  const normalized = path.posix.normalize(decodedPath);

  if (decodedPath !== normalized || !normalized.startsWith(LOCAL_THUMBNAIL_PREFIX)) {
    return null;
  }

  return path.join(PUBLIC_DIR, normalized);
}

async function getMissingLocalThumbnailFiles(apps) {
  const missing = [];

  for (const app of apps) {
    const thumbnailPath = getLocalThumbnailPath(app.thumbnailUrl);
    if (!thumbnailPath) {
      continue;
    }

    try {
      const stat = await fs.stat(thumbnailPath);
      if (!stat.isFile() || stat.size <= 0) {
        missing.push(app.id);
      }
    } catch {
      missing.push(app.id);
    }
  }

  return missing;
}

function compareAppSets(dbApps, snapshotApps) {
  const dbById = new Map(dbApps.map((app) => [app.id, app]));
  const snapshotById = new Map(snapshotApps.map((app) => [app.id, app]));
  const missing = [];
  const extra = [];
  const mismatches = [];

  for (const app of dbApps) {
    const snapshotApp = snapshotById.get(app.id);

    if (!snapshotApp) {
      missing.push(app.id);
      continue;
    }

    const fields = findFieldMismatches(app, snapshotApp);
    if (fields.length > 0) {
      mismatches.push({
        id: app.id,
        fields
      });
    }
  }

  for (const app of snapshotApps) {
    if (!dbById.has(app.id)) {
      extra.push(app.id);
    }
  }

  const orderMismatchCount = dbApps.reduce((count, app, index) => {
    return snapshotApps[index]?.id === app.id ? count : count + 1;
  }, 0);

  return {
    missing,
    extra,
    mismatches,
    orderMismatchCount
  };
}

async function run() {
  const [dbApps, snapshot] = await Promise.all([
    fetchAppsFromPostgres(),
    readSnapshot()
  ]);

  const snapshotApps = snapshot.apps;
  const compared = compareAppSets(dbApps, snapshotApps);
  const thumbnailStats = getThumbnailStats(snapshotApps);
  const missingLocalThumbnailFiles = await getMissingLocalThumbnailFiles(
    snapshotApps
  );

  const result = {
    ok: false,
    dbCount: dbApps.length,
    snapshotCount: snapshotApps.length,
    missingCount: compared.missing.length,
    extraCount: compared.extra.length,
    mismatchCount: compared.mismatches.length,
    orderMismatchCount: compared.orderMismatchCount,
    thumbnailStats,
    missingLocalThumbnailFileCount: missingLocalThumbnailFiles.length,
    missing: compared.missing.slice(0, 20),
    extra: compared.extra.slice(0, 20),
    mismatches: compared.mismatches.slice(0, 20),
    missingLocalThumbnailFiles: missingLocalThumbnailFiles.slice(0, 20)
  };

  result.ok =
    result.dbCount === result.snapshotCount &&
    result.missingCount === 0 &&
    result.extraCount === 0 &&
    result.mismatchCount === 0 &&
    result.orderMismatchCount === 0 &&
    thumbnailStats.local === snapshotApps.length &&
    thumbnailStats.remote === 0 &&
    thumbnailStats.null === 0 &&
    thumbnailStats.other === 0 &&
    result.missingLocalThumbnailFileCount === 0;

  console.log(JSON.stringify(result, null, 2));

  if (!result.ok) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(
    `[error] unable to verify static gallery: ${
      error instanceof Error ? error.message : String(error)
    }`
  );
  process.exitCode = 1;
});
