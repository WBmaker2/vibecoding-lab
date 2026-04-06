import type { AppRecord, ThumbnailMode } from "./types";

export interface SerializedAppRecord {
  id: string;
  title: string;
  summary: string;
  url: string;
  tags: string[];
  thumbnailMode: ThumbnailMode;
  thumbnailUrl: string | null;
  subject: string | null;
  grade: string | null;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppsBackupPayload {
  version: 1;
  generatedAt: string;
  appCount: number;
  apps: SerializedAppRecord[];
}

export function serializeAppRecord(app: AppRecord): SerializedAppRecord {
  return {
    id: app.id,
    title: app.title,
    summary: app.summary,
    url: app.url,
    tags: [...app.tags],
    thumbnailMode: app.thumbnailMode,
    thumbnailUrl: app.thumbnailUrl,
    subject: app.subject ?? null,
    grade: app.grade ?? null,
    memo: app.memo ?? null,
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString()
  };
}

export function createAppsBackupPayload(
  apps: AppRecord[],
  generatedAt = new Date()
): AppsBackupPayload {
  return {
    version: 1,
    generatedAt: generatedAt.toISOString(),
    appCount: apps.length,
    apps: apps.map(serializeAppRecord)
  };
}

export function getAppsBackupFilename(date = new Date()) {
  const stamp = date.toISOString().replaceAll(":", "-");
  return `hongs-vibe-coding-lab-apps-${stamp}.json`;
}
