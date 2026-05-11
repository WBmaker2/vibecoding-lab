import snapshot from "@/data/public-apps.json";
import type { PublicAppRecord, ThumbnailMode } from "./types";
import path from "node:path";

export interface SerializedPublicAppRecord {
  id: string;
  title: string;
  summary: string;
  url: string;
  tags: string[];
  thumbnailMode: string;
  thumbnailUrl: string | null;
  subject?: string | null;
  grade?: string | null;
  memo?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PublicAppsSnapshot {
  version: number;
  generatedAt: string;
  appCount: number;
  apps: SerializedPublicAppRecord[];
}

const INTERNAL_COMPUTE_PREFIXES = ["/api/app-thumbnail/", "/api/thumbnail"];
const THUMBNAIL_MODES = new Set<ThumbnailMode>([
  "auto",
  "upload",
  "placeholder"
]);

function hasDotTraversalSegments(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  return segments.some((segment) => segment === "." || segment === "..");
}

function getRawAbsoluteUrlPath(value: string): string | null {
  const match = value.match(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]*(\/[^?#]*)?/i);
  return match?.[1] ?? "/";
}

function hasUnsafeAbsoluteUrlPath(value: string): boolean {
  const rawPath = getRawAbsoluteUrlPath(value);

  if (!rawPath) {
    return true;
  }

  try {
    return hasDotTraversalSegments(decodeURIComponent(rawPath));
  } catch {
    return true;
  }
}

function normalizeThumbnailMode(value: string): ThumbnailMode {
  return THUMBNAIL_MODES.has(value as ThumbnailMode)
    ? (value as ThumbnailMode)
    : "placeholder";
}

function normalizeStaticPath(value: string): string | null {
  try {
    const pathOnly = value.split(/[?#]/)[0];
    const decodedPathname = decodeURIComponent(pathOnly);
    const normalizedPathname = path.posix.normalize(decodedPathname);

    if (decodedPathname !== normalizedPathname) {
      return null;
    }

    return normalizedPathname;
  } catch {
    return null;
  }
}

function isAllowedStaticPath(value: string): boolean {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return false;
  }

  const normalized = normalizeStaticPath(value);

  if (!normalized) {
    return false;
  }

  if (
    normalized.startsWith("/app-thumbnails/") ||
    normalized.startsWith("/images/")
  ) {
    return true;
  }

  return false;
}

function isInternalComputeAbsolutePath(pathname: string) {
  if (hasDotTraversalSegments(pathname)) {
    return false;
  }

  return INTERNAL_COMPUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function normalizeStaticThumbnailUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }

  if (value.startsWith("/")) {
    if (!isAllowedStaticPath(value)) {
      return null;
    }

    return value;
  }

  if (INTERNAL_COMPUTE_PREFIXES.some((prefix) => value.startsWith(prefix))) {
    return null;
  }

  try {
    if (hasUnsafeAbsoluteUrlPath(value)) {
      return null;
    }

    const parsedUrl = new URL(value);
    if (
      (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") &&
      isInternalComputeAbsolutePath(
        decodeURIComponent(parsedUrl.pathname || "")
      )
    ) {
      return null;
    }

    if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
      return parsedUrl.toString();
    }
  } catch {
    return null;
  }

  return null;
}

export function toStaticPublicAppRecord(
  app: SerializedPublicAppRecord
): PublicAppRecord {
  return {
    id: app.id,
    title: app.title,
    summary: app.summary,
    url: app.url,
    tags: Array.isArray(app.tags) ? app.tags : [],
    thumbnailMode: normalizeThumbnailMode(app.thumbnailMode),
    thumbnailUrl: normalizeStaticThumbnailUrl(app.thumbnailUrl),
    subject: app.subject ?? undefined,
    grade: app.grade ?? undefined,
    memo: app.memo ?? undefined,
    createdAt: new Date(app.createdAt),
    updatedAt: new Date(app.updatedAt)
  };
}

export function listStaticPublicApps() {
  return (snapshot as PublicAppsSnapshot).apps.map(toStaticPublicAppRecord);
}
