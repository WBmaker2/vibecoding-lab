import fs from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const DEFAULT_BASE_URL = "https://www.vivehong.shop";
const OUTPUT_JSON_PATH = path.join(
  process.cwd(),
  "src",
  "data",
  "public-apps.json"
);
const OUTPUT_THUMBNAIL_DIR = path.join(
  process.cwd(),
  "public",
  "app-thumbnails"
);

const CLI_FLAGS = {
  backup: "--backup",
  baseUrl: "--base-url"
};

const DATA_IMAGE_PATTERN =
  /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i;
const STATIC_ASSET_BASE_URL = "https://static.local";

const VALID_THUMBNAIL_MODES = new Set(["auto", "upload", "placeholder"]);
const MIME_TO_EXTENSION = {
  "image/png": "png",
  "image/jpg": "jpg",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/avif": "avif",
  "image/bmp": "bmp",
  "image/tiff": "tiff"
};
const DIRECT_INTERNAL_THUMBNAIL_PREFIXES = [
  "/api/app-thumbnail/",
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

function decodeRelativePath(value) {
  const pathOnly = value.split(/[?#]/)[0];

  try {
    return decodeURIComponent(pathOnly);
  } catch {
    return null;
  }
}

function hasUnsafeRelativeDotTraversal(value) {
  const decoded = decodeRelativePath(value);

  if (!decoded) {
    return true;
  }

  return hasDotTraversalSegments(decoded);
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

function isDirectInternalThumbnailRoute(value) {
  if (!value.startsWith("/")) {
    return false;
  }

  const pathname = decodeRelativePath(value);
  if (!pathname) {
    return false;
  }

  if (hasDotTraversalSegments(pathname)) {
    return false;
  }

  return DIRECT_INTERNAL_THUMBNAIL_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
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

function getDataImageInfo(value) {
  const match = value.match(DATA_IMAGE_PATTERN);
  if (!match) {
    return null;
  }

  const [, contentType, payload] = match;
  const extension =
    MIME_TO_EXTENSION[contentType.toLowerCase()] || contentType.split("/")[1];
  const buffer = Buffer.from(payload, "base64");

  if (!buffer.byteLength) {
    return null;
  }

  return {
    extension,
    buffer
  };
}

function inferExtensionFromMime(contentType) {
  if (!contentType) {
    return null;
  }

  const normalized = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  return MIME_TO_EXTENSION[normalized] || null;
}

function inferExtensionFromPath(urlValue) {
  const normalized = new URL(urlValue).pathname.split("?")[0];
  const fileName = normalized.split("/").pop();

  if (!fileName) {
    return null;
  }

  const parts = fileName.split(".");
  if (parts.length < 2) {
    return null;
  }

  const extension = parts.at(-1);

  if (!extension || extension.length > 6) {
    return null;
  }

  return extension.toLowerCase().match(/^[a-z0-9]+$/) ? extension.toLowerCase() : null;
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

function resolveContentTypeExtension(urlValue, headers) {
  const fromHeader = inferExtensionFromMime(headers.get("content-type"));
  if (fromHeader) {
    return fromHeader;
  }

  const fromPath = inferExtensionFromPath(urlValue);
  if (fromPath) {
    return fromPath;
  }

  return "png";
}

async function downloadAndWriteImage(urlValue, baseUrl, filename) {
  const targetUrl = new URL(urlValue, baseUrl).toString();
  const response = await fetch(targetUrl, {
    headers: { "user-agent": "codex-export-static-gallery" }
  });

  if (!response.ok) {
    return { failed: true };
  }

  const responseBuffer = Buffer.from(await response.arrayBuffer());
  const extension = resolveContentTypeExtension(targetUrl, response.headers);
  const extFilename =
    path.extname(filename) ? filename : `${filename}.${extension}`;
  const output = path.join(OUTPUT_THUMBNAIL_DIR, extFilename);
  await writeBufferAtomically(output, responseBuffer);

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

function coerceText(value) {
  return typeof value === "string" ? value : "";
}

function coerceNullableText(value) {
  return value == null ? null : coerceText(value);
}

function coerceTags(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((tag) => typeof tag === "string");
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

async function fetchAppsFromBackup(backupPath) {
  const raw = await fs.readFile(backupPath, "utf8");
  const payload = JSON.parse(raw);

  if (!payload || typeof payload !== "object" || !Array.isArray(payload.apps)) {
    throw new Error(`Backup JSON must include an apps array: ${backupPath}`);
  }

  return payload.apps.map((app, index) => toPublicSnapshotApp(app, index));
}

async function fetchApps() {
  if (!process.env.POSTGRES_URL && !BACKUP_PATH) {
    throw new Error(
      "Cannot refresh public snapshot: POSTGRES_URL is missing and --backup was not provided."
    );
  }

  if (BACKUP_PATH) {
    return fetchAppsFromBackup(BACKUP_PATH);
  }

  return fetchAppsFromPostgres();
}

async function materializeThumbnail(app, slug) {
  const rawUrl = app?.thumbnailUrl;
  if (!rawUrl) {
    return null;
  }

  if (typeof rawUrl !== "string") {
    return null;
  }

  if (rawUrl.startsWith("/") && !rawUrl.startsWith("//")) {
    if (hasUnsafeRelativeDotTraversal(rawUrl)) {
      throw new Error(`Unsafe relative thumbnail path: ${rawUrl}`);
    }

    if (isSafeStaticThumbnailPath(rawUrl)) {
      return rawUrl;
    }

    if (isDirectInternalThumbnailRoute(rawUrl)) {
      const downloaded = await downloadOrNull(rawUrl, slug);
      if (downloaded == null) {
        return null;
      }

      return downloaded;
    }

    throw new Error(`Unsafe relative thumbnail path: ${rawUrl}`);
  }

  if (rawUrl.startsWith("data:")) {
    const dataImage = getDataImageInfo(rawUrl);
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

    return resolvedAbsoluteUrl;
  }

  return null;
}

async function downloadOrNull(urlValue, slug) {
  try {
    const downloaded = await downloadAndWriteImage(urlValue, BASE_URL, slug);
    if (downloaded.failed) {
      return null;
    }

    return `/app-thumbnails/${downloaded.filename}`;
  } catch {
    return null;
  }
}

function validateSnapshotPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("snapshot payload must be an object");
  }

  if (payload.version !== 1 || typeof payload.version !== "number") {
    throw new Error("snapshot payload must have version 1");
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

async function run() {
  await fs.mkdir(OUTPUT_THUMBNAIL_DIR, { recursive: true });
  const apps = await fetchApps();
  const failedRelativeThumbnails = [];

  const usedSlugs = new Set();
  const normalizedApps = [];

  for (const [index, rawApp] of apps.entries()) {
    const slug = makeSafeSlug(rawApp, index, usedSlugs);
    const originalThumbnailUrl = rawApp?.thumbnailUrl;

    const appPayload = {
      id: String(rawApp.id),
      title: String(rawApp.title),
      summary: String(rawApp.summary),
      url: String(rawApp.url),
      githubUrl: rawApp.githubUrl ?? null,
      tags: Array.isArray(rawApp.tags) ? rawApp.tags : [],
      thumbnailMode: normalizeThumbnailMode(rawApp.thumbnailMode),
      thumbnailUrl: await materializeThumbnail(rawApp, slug),
      subject: rawApp.subject ?? null,
      grade: rawApp.grade ?? null,
      memo: rawApp.memo ?? null,
      createdAt: normalizeDateValue(rawApp.createdAt),
      updatedAt: normalizeDateValue(rawApp.updatedAt)
    };

    const shouldTrackInternalFailure =
      typeof originalThumbnailUrl === "string" &&
      originalThumbnailUrl.startsWith("/") &&
      !originalThumbnailUrl.startsWith("//") &&
      !isAbsoluteHttpUrl(originalThumbnailUrl) &&
      appPayload.thumbnailUrl == null;

    if (shouldTrackInternalFailure) {
      failedRelativeThumbnails.push({
        id: String(rawApp.id),
        thumbnailUrl: originalThumbnailUrl
      });
    }

    normalizedApps.push(appPayload);
  }

  if (failedRelativeThumbnails.length > 0) {
    const firstFailure = failedRelativeThumbnails[0];
    throw new Error(
      `Unable to materialize internal thumbnail: ${firstFailure.thumbnailUrl} (app ${firstFailure.id})`
    );
  }

  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    appCount: normalizedApps.length,
    apps: normalizedApps
  };

  await writeSnapshotAtomically(payload);
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
