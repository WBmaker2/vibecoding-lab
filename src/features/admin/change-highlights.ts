import type { AdminAppRecord } from "@/lib/apps/types";

export interface RecentAdminChange {
  appId: string;
  fields: string[];
}

function normalizeText(value?: string) {
  return value?.trim() ?? "";
}

function normalizeTags(tags: string[]) {
  return [...tags].map((tag) => tag.trim()).filter(Boolean).sort();
}

function parseTags(formData: FormData, fallback: string[]) {
  const raw = String(formData.get("tagsJson") ?? "[]");

  try {
    const parsed = JSON.parse(raw) as string[];
    return parsed.map((tag) => tag.trim()).filter(Boolean);
  } catch {
    return fallback;
  }
}

function parseOptionalField(formData: FormData, name: string, fallback?: string) {
  const value = String(formData.get(name) ?? "").trim();
  return value || fallback || undefined;
}

export function buildAdminAppPreviewFromFormData(
  previous: AdminAppRecord,
  formData: FormData
): AdminAppRecord {
  const thumbnailMode = String(formData.get("thumbnailMode") ?? previous.thumbnailMode);
  const nextThumbnailMode =
    thumbnailMode === "auto" ||
    thumbnailMode === "upload" ||
    thumbnailMode === "placeholder"
      ? thumbnailMode
      : previous.thumbnailMode;

  return {
    ...previous,
    title: String(formData.get("title") ?? previous.title).trim() || previous.title,
    summary:
      String(formData.get("summary") ?? previous.summary).trim() ||
      previous.summary,
    url: String(formData.get("url") ?? previous.url).trim() || previous.url,
    githubUrl: parseOptionalField(formData, "githubUrl", previous.githubUrl),
    tags: parseTags(formData, previous.tags),
    thumbnailMode: nextThumbnailMode,
    subject: parseOptionalField(formData, "subject", previous.subject),
    grade: parseOptionalField(formData, "grade", previous.grade),
    memo: parseOptionalField(formData, "memo", previous.memo),
    updatedAt: new Date()
  };
}

export function getChangedAdminFieldLabels(
  previous: AdminAppRecord,
  next: AdminAppRecord
) {
  const changedFields: string[] = [];

  if (normalizeText(previous.title) !== normalizeText(next.title)) {
    changedFields.push("제목");
  }

  if (normalizeText(previous.summary) !== normalizeText(next.summary)) {
    changedFields.push("한 줄 설명");
  }

  if (normalizeText(previous.url) !== normalizeText(next.url)) {
    changedFields.push("앱 링크");
  }

  if (normalizeText(previous.githubUrl) !== normalizeText(next.githubUrl)) {
    changedFields.push("GitHub 링크");
  }

  if (
    normalizeTags(previous.tags).join("|") !== normalizeTags(next.tags).join("|")
  ) {
    changedFields.push("태그");
  }

  if (previous.thumbnailMode !== next.thumbnailMode) {
    changedFields.push("썸네일");
  }

  if (normalizeText(previous.subject) !== normalizeText(next.subject)) {
    changedFields.push("과목");
  }

  if (normalizeText(previous.grade) !== normalizeText(next.grade)) {
    changedFields.push("학년");
  }

  if (normalizeText(previous.memo) !== normalizeText(next.memo)) {
    changedFields.push("메이커 노트");
  }

  return changedFields;
}

export function getAdminNotePreview(note?: string, limit = 120) {
  const normalized = normalizeText(note);

  if (!normalized) {
    return "";
  }

  return normalized.length > limit
    ? `${normalized.slice(0, limit).trimEnd()}…`
    : normalized;
}
