import type { AdminAppRecord, ThumbnailMode } from "./types";
import { normalizeAppMetadata } from "./metadata";

export interface SerializedAppRecord {
  id: string;
  title: string;
  summary: string;
  url: string;
  githubUrl?: string | null;
  tags: string[];
  thumbnailMode: ThumbnailMode;
  thumbnailUrl: string | null;
  subject: string | null;
  grade: string | null;
  memo: string | null;
  subjects: string[];
  gradeBands: string[];
  audience: string | null;
  interactionType: string | null;
  learningProcess: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AppsBackupPayload {
  version: 1;
  generatedAt: string;
  appCount: number;
  apps: SerializedAppRecord[];
}

export function serializeAppRecord(app: AdminAppRecord): SerializedAppRecord {
  const metadata = normalizeAppMetadata(app);
  return {
    id: app.id,
    title: app.title,
    summary: app.summary,
    url: app.url,
    githubUrl: app.githubUrl ?? null,
    tags: [...app.tags],
    thumbnailMode: app.thumbnailMode,
    thumbnailUrl: app.thumbnailUrl,
    subject: app.subject ?? null,
    grade: app.grade ?? null,
    memo: app.memo ?? null,
    subjects: metadata.subjects,
    gradeBands: metadata.gradeBands,
    audience: metadata.audience,
    interactionType: metadata.interactionType,
    learningProcess: metadata.learningProcess,
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString()
  };
}

export function createAppsBackupPayload(
  apps: AdminAppRecord[],
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
