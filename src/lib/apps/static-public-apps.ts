import snapshot from "@/data/public-apps.json";
import { isLegacyThumbnailComputeUrl } from "@/lib/storage/public-thumbnail";
import type { PublicAppRecord, ThumbnailMode } from "./types";
import { normalizeAppMetadata } from "./metadata";
import type { StaticGalleryBaseline } from "./static-gallery-sync-state";
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
  subjects?: string[] | null;
  gradeBands?: string[] | null;
  audience?: string | null;
  interactionType?: string | null;
  learningProcess?: string[] | null;
  createdAt: string;
  updatedAt: string;
}

interface PublicAppsSnapshot {
  assetManifest?: unknown;
  catalogRevision?: number;
  version: number;
  generatedAt: string;
  appCount: number;
  apps: SerializedPublicAppRecord[];
}

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

function normalizeStaticThumbnailUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }

  if (isLegacyThumbnailComputeUrl(value)) {
    return null;
  }

  if (value.startsWith("/")) {
    if (!isAllowedStaticPath(value)) {
      return null;
    }

    return value;
  }

  try {
    if (hasUnsafeAbsoluteUrlPath(value)) {
      return null;
    }

    const parsedUrl = new URL(value);

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
  const metadata = normalizeAppMetadata(app);
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
    ...metadata,
    createdAt: new Date(app.createdAt),
    updatedAt: new Date(app.updatedAt)
  };
}

export function listStaticPublicApps() {
  return (snapshot as PublicAppsSnapshot).apps.map(toStaticPublicAppRecord);
}

export function getStaticGalleryBaseline(
  staticSnapshot: PublicAppsSnapshot = snapshot as PublicAppsSnapshot
): StaticGalleryBaseline {
  const baseline: StaticGalleryBaseline = {
    generatedAt: staticSnapshot.generatedAt,
    appCount: staticSnapshot.appCount,
    updatedAtById: Object.fromEntries(
      staticSnapshot.apps.map((app) => [app.id, app.updatedAt])
    )
  };

  const catalogRevision = staticSnapshot.catalogRevision;
  if (
    typeof catalogRevision === "number" &&
    Number.isSafeInteger(catalogRevision) &&
    catalogRevision >= 0
  ) {
    baseline.catalogRevision = catalogRevision;
  }

  if (Object.hasOwn(staticSnapshot, "assetManifest")) {
    baseline.assetManifest = staticSnapshot.assetManifest;
  }

  return baseline;
}
