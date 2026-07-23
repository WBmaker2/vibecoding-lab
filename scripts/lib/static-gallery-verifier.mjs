import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const LOCAL_THUMBNAIL_PREFIX = "/app-thumbnails/";
const COMPARED_FIELDS = [
  "id",
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

function stableJson(value) {
  return JSON.stringify(value);
}

function classifyThumbnail(thumbnailUrl) {
  if (thumbnailUrl === null) {
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
      stats[classifyThumbnail(app.thumbnailUrl)] += 1;
      return stats;
    },
    { local: 0, remote: 0, null: 0, other: 0 }
  );
}

function getLocalThumbnailPath(thumbnailDir, thumbnailUrl) {
  if (typeof thumbnailUrl !== "string") {
    return null;
  }

  let parsed;

  try {
    parsed = new URL(thumbnailUrl, "https://static.local");
  } catch {
    return null;
  }

  if (parsed.search || parsed.hash) {
    return null;
  }

  let decodedPath;

  try {
    decodedPath = decodeURIComponent(parsed.pathname);
  } catch {
    return null;
  }

  const normalized = path.posix.normalize(decodedPath);

  if (
    decodedPath !== normalized ||
    !normalized.startsWith(LOCAL_THUMBNAIL_PREFIX) ||
    normalized.slice(LOCAL_THUMBNAIL_PREFIX.length).includes("/")
  ) {
    return null;
  }

  return path.join(
    thumbnailDir,
    normalized.slice(LOCAL_THUMBNAIL_PREFIX.length)
  );
}

async function getMissingLocalThumbnailFiles(apps, thumbnailDir) {
  const missing = [];

  for (const app of apps) {
    if (classifyThumbnail(app.thumbnailUrl) !== "local") {
      continue;
    }

    const thumbnailPath = getLocalThumbnailPath(thumbnailDir, app.thumbnailUrl);

    if (!thumbnailPath) {
      missing.push(app.id);
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

    const fields = COMPARED_FIELDS.filter(
      (field) => stableJson(app[field]) !== stableJson(snapshotApp[field])
    );

    if (fields.length > 0) {
      mismatches.push({ id: app.id, fields });
    }
  }

  for (const app of snapshotApps) {
    if (!dbById.has(app.id)) {
      extra.push(app.id);
    }
  }

  const orderMismatchCount = dbApps.reduce(
    (count, app, index) =>
      snapshotApps[index]?.id === app.id ? count : count + 1,
    0
  );

  return { missing, extra, mismatches, orderMismatchCount };
}

function normalizeManifest(manifest) {
  if (!Array.isArray(manifest)) {
    return null;
  }

  const normalized = [];
  const paths = new Set();

  for (const entry of manifest) {
    if (
      !entry ||
      typeof entry.path !== "string" ||
      !/^\/app-thumbnails\/[^/]+$/.test(entry.path) ||
      paths.has(entry.path) ||
      !Number.isSafeInteger(entry.size) ||
      entry.size < 0 ||
      typeof entry.sha256 !== "string" ||
      !/^[a-f0-9]{64}$/i.test(entry.sha256)
    ) {
      return null;
    }

    paths.add(entry.path);
    normalized.push({
      path: entry.path,
      size: entry.size,
      sha256: entry.sha256.toLowerCase()
    });
  }

  return normalized.sort((left, right) => left.path.localeCompare(right.path));
}

async function readActualManifest(thumbnailDir) {
  let entries;

  try {
    entries = await fs.readdir(thumbnailDir, { withFileTypes: true });
  } catch {
    entries = [];
  }

  const manifest = [];

  for (const entry of entries) {
    if (!entry.isFile()) {
      return null;
    }

    const buffer = await fs.readFile(path.join(thumbnailDir, entry.name));
    manifest.push({
      path: `${LOCAL_THUMBNAIL_PREFIX}${entry.name}`,
      size: buffer.byteLength,
      sha256: createHash("sha256").update(buffer).digest("hex")
    });
  }

  return manifest.sort((left, right) => left.path.localeCompare(right.path));
}

function compareManifest(expected, actual, referencedPaths) {
  if (!expected || !actual) {
    return { valid: false, reason: "invalid-manifest" };
  }

  const expectedByPath = new Map(expected.map((entry) => [entry.path, entry]));
  const actualByPath = new Map(actual.map((entry) => [entry.path, entry]));

  if ([...referencedPaths].some((entry) => !expectedByPath.has(entry))) {
    return { valid: false, reason: "missing-assets" };
  }

  if (expected.some((entry) => !referencedPaths.has(entry.path))) {
    return { valid: false, reason: "extra-assets" };
  }

  if (expected.some((entry) => !actualByPath.has(entry.path))) {
    return { valid: false, reason: "missing-assets" };
  }

  if (actual.some((entry) => !expectedByPath.has(entry.path))) {
    return { valid: false, reason: "extra-assets" };
  }

  if (
    actual.some((entry) => {
      const expectedEntry = expectedByPath.get(entry.path);
      return (
        expectedEntry.size !== entry.size ||
        expectedEntry.sha256 !== entry.sha256
      );
    })
  ) {
    return { valid: false, reason: "changed-assets" };
  }

  return { valid: true, reason: "assets-match" };
}

export async function verifyStaticGallerySnapshot({
  dbApps,
  snapshot,
  thumbnailDir
}) {
  const snapshotApps = snapshot.apps;
  const compared = compareAppSets(dbApps, snapshotApps);
  const thumbnailStats = getThumbnailStats(snapshotApps);
  const missingLocalThumbnailFiles = await getMissingLocalThumbnailFiles(
    snapshotApps,
    thumbnailDir
  );
  const assetIntegrity = compareManifest(
    normalizeManifest(snapshot.assetManifest),
    await readActualManifest(thumbnailDir),
    new Set(
      snapshotApps
        .filter((app) => classifyThumbnail(app.thumbnailUrl) === "local")
        .map((app) => app.thumbnailUrl)
    )
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
    assetIntegrity,
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
    thumbnailStats.local + thumbnailStats.null === snapshotApps.length &&
    thumbnailStats.remote === 0 &&
    thumbnailStats.other === 0 &&
    result.missingLocalThumbnailFileCount === 0 &&
    assetIntegrity.valid;

  return result;
}
