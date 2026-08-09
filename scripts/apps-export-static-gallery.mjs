import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { decodeDataImageUrl } from "../src/lib/security/image-policy.mjs";
import {
  fetchAppSnapshotFromConfiguredDatabase,
  toPublicSnapshotApp
} from "./lib/apps-database.mjs";
import { getConfiguredDatabaseProvider } from "./lib/database-provider.mjs";
import { getReusableSnapshotDecision } from "./lib/static-gallery-export-state.mjs";
import { fetchSafeImage } from "./lib/safe-image-download.mjs";

const DEFAULT_BASE_URL = "https://www.vivehong.shop";
const OUTPUT_JSON_PATH = path.resolve(
  process.env.STATIC_GALLERY_OUTPUT_JSON_PATH ||
    path.join(process.cwd(), "src", "data", "public-apps.json")
);
const OUTPUT_THUMBNAIL_DIR = path.resolve(
  process.env.STATIC_GALLERY_OUTPUT_THUMBNAIL_DIR ||
    path.join(process.cwd(), "public", "app-thumbnails")
);

const CLI_FLAGS = {
  backup: "--backup",
  baseUrl: "--base-url"
};

const STATIC_ASSET_BASE_URL = "https://static.local";

const VALID_THUMBNAIL_MODES = new Set(["auto", "upload", "placeholder"]);
const DIRECT_INTERNAL_THUMBNAIL_PREFIXES = [
  "/api/app-thumbnail",
  "/api/thumbnail"
];

const { baseUrl, backupPath } = parseCliOptions(process.argv.slice(2));
const BASE_URL = baseUrl;
const BASE_ORIGIN = new URL(BASE_URL).origin;
const BACKUP_PATH = backupPath;

function parseCliOptions(rawArgs) {
  const options = {
    baseUrl: DEFAULT_BASE_URL,
    backupPath: null,
    baseUrlSetByFlag: false,
    positionalBaseUrlSet: false
  };

  for (let i = 0; i < rawArgs.length; i += 1) {
    const arg = rawArgs[i];

    if (arg === CLI_FLAGS.baseUrl) {
      const value = rawArgs[i + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("Usage error: --base-url requires a URL value.");
      }

      if (options.baseUrlSetByFlag) {
        throw new Error("Do not pass --base-url more than once.");
      }

      if (options.positionalBaseUrlSet) {
        throw new Error(
          "Do not pass both --base-url and a positional base URL."
        );
      }

      if (!isAbsoluteHttpUrl(value)) {
        throw new Error(`Invalid base URL: ${value}`);
      }

      options.baseUrl = value;
      options.baseUrlSetByFlag = true;
      i += 1;
      continue;
    }

    if (arg === CLI_FLAGS.backup) {
      const value = rawArgs[i + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("Usage error: --backup requires a file path.");
      }

      if (options.backupPath) {
        throw new Error("Do not pass --backup more than once.");
      }

      options.backupPath = value;
      i += 1;
      continue;
    }

    if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    }

    if (!isAbsoluteHttpUrl(arg)) {
      throw new Error(`Unexpected positional argument: ${arg}`);
    }

    if (options.positionalBaseUrlSet || options.baseUrlSetByFlag) {
      throw new Error(
        "Do not pass multiple positional URLs or combine positional URL with --base-url."
      );
    }

    options.baseUrl = arg;
    options.positionalBaseUrlSet = true;
  }

  return options;
}

function isAbsoluteHttpUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function hasDotTraversalSegments(pathname) {
  const segments = pathname.split("/").filter(Boolean);

  return segments.some((segment) => segment === "." || segment === "..");
}

function getRawUrlPath(value) {
  const match =
    value.match(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]*(\/[^?#]*)?/i) ??
    value.match(/^\/\/[^/?#]*(\/[^?#]*)?/);

  return match?.[1] ?? "/";
}

function hasUnsafeRawUrlPath(value) {
  const rawPath = getRawUrlPath(value);

  try {
    return hasDotTraversalSegments(decodeURIComponent(rawPath));
  } catch {
    return true;
  }
}

function isSafeStaticThumbnailPath(value) {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return false;
  }

  if (
    !value.startsWith("/app-thumbnails/") &&
    !value.startsWith("/images/")
  ) {
    return false;
  }

  try {
    const decodedPath = resolveSafePath(value);
    const normalized = path.posix.normalize(decodedPath);

    if (decodedPath !== normalized) {
      return false;
    }

    return (
      normalized.startsWith("/app-thumbnails/") ||
      normalized.startsWith("/images/")
    );
  } catch {
    return false;
  }
}

function resolveSafePath(value) {
  const parsed = new URL(value, STATIC_ASSET_BASE_URL);
  return decodeURIComponent(parsed.pathname);
}

function getRawThumbnailPath(value) {
  const match =
    value.match(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]*(\/[^?#]*)?/i) ??
    value.match(/^\/\/[^/?#]*(\/[^?#]*)?/);

  return match?.[1] ?? value.split(/[?#]/)[0];
}

function normalizeThumbnailPath(value) {
  try {
    const pathname = decodeURIComponent(getRawThumbnailPath(value));
    const segments = [];
    let hasUnsafeTraversal = false;

    for (const segment of pathname.split("/")) {
      if (!segment) {
        continue;
      }

      if (segment === ".") {
        hasUnsafeTraversal = true;
        continue;
      }

      if (segment === "..") {
        hasUnsafeTraversal = true;
        segments.pop();
        continue;
      }

      segments.push(segment);
    }

    const normalized = `/${segments.join("/")}`;
    return {
      hasUnsafeTraversal,
      pathname:
        normalized.length > 1
          ? normalized.replace(/\/+$/, "")
          : normalized
    };
  } catch {
    return null;
  }
}

function isLegacyInternalThumbnailUrl(value) {
  if (typeof value !== "string" || !value.trim()) {
    return false;
  }

  const normalizedPath = normalizeThumbnailPath(value.trim());

  if (!normalizedPath || normalizedPath.hasUnsafeTraversal) {
    return false;
  }

  return DIRECT_INTERNAL_THUMBNAIL_PREFIXES.some((prefix) => {
    if (normalizedPath.pathname === prefix) {
      return prefix === "/api/thumbnail";
    }

    if (prefix !== "/api/app-thumbnail") {
      return false;
    }

    if (!normalizedPath.pathname.startsWith(`${prefix}/`)) {
      return false;
    }

    return (
      normalizedPath.pathname
        .slice(`${prefix}/`.length)
        .split("/")
        .filter(Boolean).length === 2
    );
  });
}

function isUnsafeThumbnailUrl(value) {
  if (typeof value !== "string" || !value.trim()) {
    return false;
  }

  const normalizedPath = normalizeThumbnailPath(value.trim());

  return !normalizedPath || normalizedPath.hasUnsafeTraversal;
}

async function writeBufferAtomically(filePath, buffer) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp.${Date.now()}.${Math.random()
    .toString(36)
    .slice(2)}`;

  try {
    await fs.writeFile(temporaryPath, buffer);
    await fs.rename(temporaryPath, filePath);
  } catch (error) {
    await fs.unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}

function normalizeThumbnailMode(value) {
  return VALID_THUMBNAIL_MODES.has(value) ? value : "placeholder";
}

function isProtocolRelativeUrl(value) {
  return value.startsWith("//");
}

function isSafeSameOriginThumbnailUrl(value) {
  try {
    return new URL(value, BASE_URL).origin === BASE_ORIGIN;
  } catch {
    return false;
  }
}

function resolveHttpOrProtocolRelativeUrl(value) {
  if (isAbsoluteHttpUrl(value)) {
    return value;
  }

  if (isProtocolRelativeUrl(value)) {
    return new URL(value, BASE_URL).toString();
  }

  return null;
}

function sanitizeSlug(value, fallback) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalized || fallback;
}

function makeSafeSlug(app, index, used) {
  const fallback = `app-${index + 1}`;
  const base = sanitizeSlug(String(app.id || app.title || fallback), fallback);
  let slug = base;
  let suffix = 2;

  while (used.has(slug)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  used.add(slug);

  return slug;
}

function normalizeExistingLocalThumbnailPath(value) {
  if (typeof value !== "string" || !isSafeStaticThumbnailPath(value)) {
    return null;
  }

  try {
    const parsed = new URL(value, STATIC_ASSET_BASE_URL);
    if (parsed.search || parsed.hash) {
      return null;
    }

    const pathname = decodeURIComponent(parsed.pathname);
    const basename = pathname.slice("/app-thumbnails/".length);

    if (
      !pathname.startsWith("/app-thumbnails/") ||
      !basename ||
      basename.includes("/") ||
      basename.includes("\\") ||
      path.posix.normalize(pathname) !== pathname
    ) {
      return null;
    }

    return `/app-thumbnails/${basename}`;
  } catch {
    return null;
  }
}

function findReusableLegacyThumbnail(appId, previousSnapshot, thumbnailFiles) {
  const previousApp = (Array.isArray(previousSnapshot?.apps)
    ? previousSnapshot.apps
    : []
  ).find(
    (candidate) => String(candidate?.id) === String(appId)
  );
  const localPath = normalizeExistingLocalThumbnailPath(
    previousApp?.thumbnailUrl
  );

  if (!localPath) {
    return null;
  }

  const filename = localPath.slice("/app-thumbnails/".length);
  const hasMaterializedFile = thumbnailFiles.some(
    (entry) => entry?.type === "file" && entry.name === filename
  );

  return hasMaterializedFile ? localPath : null;
}

async function downloadAndWriteImage(urlValue, baseUrl, filename) {
  const targetUrl = new URL(urlValue, baseUrl).toString();
  const image = await fetchSafeImage(targetUrl);
  const extFilename =
    path.extname(filename) ? filename : `${filename}.${image.extension}`;
  const output = path.join(OUTPUT_THUMBNAIL_DIR, extFilename);
  await writeBufferAtomically(output, image.body);

  return {
    failed: false,
    filename: path.basename(output)
  };
}

function normalizeDateValue(value) {
  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
}

async function fetchAppsFromBackup(backupPath) {
  const raw = await fs.readFile(backupPath, "utf8");
  const payload = JSON.parse(raw);

  if (!payload || typeof payload !== "object" || !Array.isArray(payload.apps)) {
    throw new Error(`Backup JSON must include an apps array: ${backupPath}`);
  }

  return payload.apps.map((app, index) => toPublicSnapshotApp(app, index));
}

async function fetchApps() {
  if (
    getConfiguredDatabaseProvider() === "none" &&
    !BACKUP_PATH
  ) {
    throw new Error(
      "Cannot refresh public snapshot: database variables are missing and --backup was not provided."
    );
  }

  if (BACKUP_PATH) {
    return {
      apps: await fetchAppsFromBackup(BACKUP_PATH),
      catalogRevision: null
    };
  }

  return fetchAppSnapshotFromConfiguredDatabase();
}

async function materializeThumbnail(
  app,
  slug,
  previousSnapshot,
  existingThumbnailFiles
) {
  const rawUrl = app?.thumbnailUrl;
  if (!rawUrl) {
    return null;
  }

  if (typeof rawUrl !== "string") {
    return null;
  }

  if (rawUrl.startsWith("/") && !rawUrl.startsWith("//")) {
    if (isUnsafeThumbnailUrl(rawUrl)) {
      return null;
    }

    if (isLegacyInternalThumbnailUrl(rawUrl)) {
      return findReusableLegacyThumbnail(
        app?.id,
        previousSnapshot,
        existingThumbnailFiles
      );
    }

    if (isSafeStaticThumbnailPath(rawUrl)) {
      return rawUrl;
    }

    throw new Error(`Unsafe relative thumbnail path: ${rawUrl}`);
  }

  if (rawUrl.startsWith("data:")) {
    const dataImage = decodeDataImageUrl(rawUrl);
    if (!dataImage) {
      return null;
    }

    const filename = `${slug}.${dataImage.extension}`;
    const outputPath = path.join(OUTPUT_THUMBNAIL_DIR, filename);
    await writeBufferAtomically(outputPath, dataImage.buffer);
    return `/app-thumbnails/${filename}`;
  }

  const resolvedAbsoluteUrl = resolveHttpOrProtocolRelativeUrl(rawUrl);
  if (resolvedAbsoluteUrl) {
    if (isUnsafeThumbnailUrl(rawUrl)) {
      return null;
    }

    if (isLegacyInternalThumbnailUrl(rawUrl)) {
      return findReusableLegacyThumbnail(
        app?.id,
        previousSnapshot,
        existingThumbnailFiles
      );
    }

    const sameOrigin = isSafeSameOriginThumbnailUrl(rawUrl);

    if (sameOrigin && hasUnsafeRawUrlPath(rawUrl)) {
      throw new Error(`Unsafe same-origin thumbnail path: ${rawUrl}`);
    }

    try {
      const downloaded = await downloadAndWriteImage(rawUrl, BASE_URL, slug);
      if (!downloaded.failed) {
        return `/app-thumbnails/${downloaded.filename}`;
      }
    } catch {
      // keep absolute URL for static page rendering if fetch fails
    }

    if (sameOrigin) {
      throw new Error(`Unable to materialize same-origin thumbnail: ${rawUrl}`);
    }

    return null;
  }

  return null;
}

function validateSnapshotPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("snapshot payload must be an object");
  }

  if (payload.version !== 1 || typeof payload.version !== "number") {
    throw new Error("snapshot payload must have version 1");
  }

  if (
    typeof payload.generatedAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      payload.generatedAt
    ) ||
    new Date(payload.generatedAt).toISOString() !== payload.generatedAt
  ) {
    throw new Error("snapshot payload must have a valid generatedAt");
  }

  if (
    payload.catalogRevision !== undefined &&
    (!Number.isSafeInteger(payload.catalogRevision) || payload.catalogRevision < 0)
  ) {
    throw new Error("snapshot payload must have a valid catalogRevision");
  }

  if (!Array.isArray(payload.apps)) {
    throw new Error("snapshot payload must include an apps array");
  }

  if (typeof payload.appCount !== "number") {
    throw new Error("snapshot payload must include numeric appCount");
  }

  if (payload.apps.length !== payload.appCount) {
    throw new Error("snapshot appCount must match number of apps");
  }

  if (!Array.isArray(payload.assetManifest)) {
    throw new Error("snapshot payload must include an assetManifest array");
  }

  const manifestPaths = new Set();

  for (const entry of payload.assetManifest) {
    if (
      !entry ||
      typeof entry.path !== "string" ||
      !/^\/app-thumbnails\/[^/]+$/.test(entry.path) ||
      manifestPaths.has(entry.path) ||
      !Number.isSafeInteger(entry.size) ||
      entry.size < 0 ||
      !/^[a-f0-9]{64}$/i.test(entry.sha256)
    ) {
      throw new Error("snapshot payload has an invalid asset manifest entry");
    }

    manifestPaths.add(entry.path);
  }

  for (const app of payload.apps) {
    if (!app || typeof app !== "object") {
      throw new Error("snapshot app entry must be an object");
    }

    if (typeof app.id !== "string" || !app.id.trim()) {
      throw new Error("snapshot app entry missing id");
    }

    if (!app.title) {
      throw new Error(`snapshot app ${app.id} missing title`);
    }

    if (typeof app.createdAt !== "string" || typeof app.updatedAt !== "string") {
      throw new Error(`snapshot app ${app.id} has invalid date fields`);
    }
  }
}

async function writeSnapshotAtomically(payload) {
  const snapshotDir = path.dirname(OUTPUT_JSON_PATH);
  await fs.mkdir(snapshotDir, { recursive: true });
  const temporaryPath = path.join(
    snapshotDir,
    `${path.basename(OUTPUT_JSON_PATH)}.${Date.now()}.tmp`
  );
  const json = JSON.stringify(payload, null, 2);

  await fs.writeFile(temporaryPath, json, "utf8");

  try {
    const written = await fs.readFile(temporaryPath, "utf8");
    const parsed = JSON.parse(written);

    validateSnapshotPayload(parsed);
    await fs.rename(temporaryPath, OUTPUT_JSON_PATH);
  } catch (error) {
    await fs.unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}

async function readExistingSnapshot() {
  try {
    const raw = await fs.readFile(OUTPUT_JSON_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function readThumbnailFiles() {
  try {
    const entries = await fs.readdir(OUTPUT_THUMBNAIL_DIR, {
      withFileTypes: true
    });
    return Promise.all(
      entries.map(async (entry) => {
        if (!entry.isFile()) {
          return {
            name: entry.name,
            type: entry.isSymbolicLink()
              ? "symlink"
              : entry.isDirectory()
                ? "directory"
                : "other"
          };
        }

        const buffer = await fs.readFile(
          path.join(OUTPUT_THUMBNAIL_DIR, entry.name)
        );

        return {
          name: entry.name,
          type: "file",
          size: buffer.byteLength,
          sha256: createHash("sha256").update(buffer).digest("hex")
        };
      })
    );
  } catch {
    return [];
  }
}

async function createAssetManifest(apps) {
  const referencedFiles = new Set(
    apps
      .map((app) => app.thumbnailUrl)
      .filter(
        (thumbnailUrl) =>
          typeof thumbnailUrl === "string" &&
          thumbnailUrl.startsWith("/app-thumbnails/")
      )
      .map((thumbnailUrl) => thumbnailUrl.slice("/app-thumbnails/".length))
  );
  const manifest = [];

  for (const filename of [...referencedFiles].sort()) {
    const filePath = path.join(OUTPUT_THUMBNAIL_DIR, filename);
    const buffer = await fs.readFile(filePath);
    manifest.push({
      path: `/app-thumbnails/${filename}`,
      size: buffer.byteLength,
      sha256: createHash("sha256").update(buffer).digest("hex")
    });
  }

  return manifest;
}

async function removeOrphanedThumbnailFiles(snapshot) {
  const referencedFiles = new Set(
    snapshot.apps
      .map((app) => app.thumbnailUrl)
      .filter(
        (thumbnailUrl) =>
          typeof thumbnailUrl === "string" &&
          thumbnailUrl.startsWith("/app-thumbnails/")
      )
      .map((thumbnailUrl) => thumbnailUrl.slice("/app-thumbnails/".length))
  );
  const entries = await fs.readdir(OUTPUT_THUMBNAIL_DIR, {
    withFileTypes: true
  });

  await Promise.all(
    entries
      .filter((entry) => !referencedFiles.has(entry.name))
      .map((entry) =>
        fs.rm(path.join(OUTPUT_THUMBNAIL_DIR, entry.name), {
          force: true,
          recursive: true
        })
      )
  );
}

async function run() {
  const { apps, catalogRevision } = await fetchApps();
  const existingSnapshot = await readExistingSnapshot();
  const existingThumbnailFiles = await readThumbnailFiles();
  const reuseDecision = getReusableSnapshotDecision({
    sourceApps: apps,
    sourceCatalogRevision: catalogRevision,
    snapshot: existingSnapshot,
    thumbnailFiles: existingThumbnailFiles
  });

  const hasUnsafeThumbnail = apps.some((app) =>
    isUnsafeThumbnailUrl(app?.thumbnailUrl)
  );

  if (reuseDecision.reusable && !hasUnsafeThumbnail) {
    console.log(
      `gallery-export changed=false reason=${reuseDecision.reason}`
    );
    return;
  }

  await fs.mkdir(OUTPUT_THUMBNAIL_DIR, { recursive: true });
  const usedSlugs = new Set();
  const normalizedApps = [];

  for (const [index, rawApp] of apps.entries()) {
    const slug = makeSafeSlug(rawApp, index, usedSlugs);
    const appPayload = {
      id: String(rawApp.id),
      title: String(rawApp.title),
      summary: String(rawApp.summary),
      url: String(rawApp.url),
      githubUrl: rawApp.githubUrl ?? null,
      tags: Array.isArray(rawApp.tags) ? rawApp.tags : [],
      thumbnailMode: normalizeThumbnailMode(rawApp.thumbnailMode),
      thumbnailUrl: await materializeThumbnail(
        rawApp,
        slug,
        existingSnapshot,
        existingThumbnailFiles
      ),
      subject: rawApp.subject ?? null,
      grade: rawApp.grade ?? null,
      memo: rawApp.memo ?? null,
      subjects: Array.isArray(rawApp.subjects) ? rawApp.subjects : [],
      gradeBands: Array.isArray(rawApp.gradeBands) ? rawApp.gradeBands : [],
      audience: rawApp.audience ?? null,
      interactionType: rawApp.interactionType ?? null,
      learningProcess: Array.isArray(rawApp.learningProcess) ? rawApp.learningProcess : [],
      createdAt: normalizeDateValue(rawApp.createdAt),
      updatedAt: normalizeDateValue(rawApp.updatedAt)
    };

    normalizedApps.push(appPayload);
  }

  const payload = {
    assetManifest: await createAssetManifest(normalizedApps),
    version: 1,
    generatedAt: new Date().toISOString(),
    appCount: normalizedApps.length,
    apps: normalizedApps,
    ...(Number.isSafeInteger(catalogRevision)
      ? { catalogRevision }
      : {})
  };

  await writeSnapshotAtomically(payload);
  await removeOrphanedThumbnailFiles(payload);
  console.log(`gallery-export changed=true reason=${reuseDecision.reason}`);
  console.log(OUTPUT_JSON_PATH);
}

run().catch((error) => {
  console.error(
    `[error] unable to export static gallery: ${
      error instanceof Error ? error.message : String(error)
    }`
  );
  process.exitCode = 1;
});
