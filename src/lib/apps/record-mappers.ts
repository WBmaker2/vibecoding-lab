import { toPublicThumbnailUrl } from "@/lib/storage/public-thumbnail";
import { normalizeTags } from "./tags";
import { normalizeAppMetadata } from "./metadata";
import type { AdminAppRecord, PublicAppRecord, ThumbnailMode } from "./types";

export interface AppRecordShape {
  id: string;
  title: string;
  summary: string;
  url: string;
  githubUrl?: string | null;
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
  createdAt: Date;
  updatedAt: Date;
}

export function toPublicAppRecord(record: AppRecordShape): PublicAppRecord {
  const metadata = normalizeAppMetadata(record);

  return {
    id: record.id,
    title: record.title,
    summary: record.summary,
    url: record.url,
    tags: normalizeTags(record.tags),
    thumbnailMode: record.thumbnailMode as ThumbnailMode,
    thumbnailUrl: toPublicThumbnailUrl({ thumbnailUrl: record.thumbnailUrl }),
    subject: record.subject ?? undefined,
    grade: record.grade ?? undefined,
    memo: record.memo ?? undefined,
    ...metadata,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

export function toAdminAppRecord(record: AppRecordShape): AdminAppRecord {
  const metadata = normalizeAppMetadata(record);

  return {
    id: record.id,
    title: record.title,
    summary: record.summary,
    url: record.url,
    tags: normalizeTags(record.tags),
    thumbnailMode: record.thumbnailMode as AdminAppRecord["thumbnailMode"],
    thumbnailUrl: record.thumbnailUrl ?? null,
    subject: record.subject ?? undefined,
    grade: record.grade ?? undefined,
    memo: record.memo ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    githubUrl: record.githubUrl ?? undefined,
    ...metadata
  };
}
