import { getTursoClient } from "@/db/turso-client";
import { normalizeAppMetadata } from "./metadata";
import { toAdminAppRecord, toPublicAppRecord } from "./record-mappers";
import { normalizeTags } from "./tags";
import type { AdminAppRecord, AppInput, PublicAppRecord, ThumbnailMode } from "./types";
import type { AppRepository } from "./repository";

type TursoValue = string | number | bigint | boolean | null | Uint8Array;

interface TursoRow {
  [key: string]: TursoValue | undefined;
}

const VALID_THUMBNAIL_MODES = new Set<ThumbnailMode>([
  "auto",
  "upload",
  "placeholder"
]);

function readText(row: TursoRow, key: string, fallback = "") {
  const value = row[key];
  return typeof value === "string" ? value : fallback;
}

function readNullableText(row: TursoRow, key: string) {
  const value = row[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function readJsonArray(row: TursoRow, key: string): string[] {
  const value = row[key];

  if (value === null || value === undefined || value === "") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value !== "string") {
    throw new Error(`Turso column ${key} must contain a JSON array.`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(`Turso column ${key} contains invalid JSON.`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Turso column ${key} must contain a JSON array.`);
  }

  return parsed.filter((item): item is string => typeof item === "string");
}

function readDate(row: TursoRow, key: string) {
  const value = row[key];
  const date = new Date(typeof value === "string" ? value : String(value ?? ""));

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Turso column ${key} contains an invalid date.`);
  }

  return date;
}

function toRecord(row: TursoRow): AdminAppRecord {
  const thumbnailMode = readText(row, "thumbnail_mode", "placeholder");

  return toAdminAppRecord({
    id: readText(row, "id"),
    title: readText(row, "title"),
    summary: readText(row, "summary"),
    url: readText(row, "url"),
    githubUrl: readNullableText(row, "github_url"),
    tags: readJsonArray(row, "tags"),
    thumbnailMode: VALID_THUMBNAIL_MODES.has(thumbnailMode as ThumbnailMode)
      ? thumbnailMode
      : "placeholder",
    thumbnailUrl: readNullableText(row, "thumbnail_url"),
    subject: readNullableText(row, "subject"),
    grade: readNullableText(row, "grade"),
    memo: readNullableText(row, "memo"),
    subjects: readJsonArray(row, "subjects"),
    gradeBands: readJsonArray(row, "grade_bands"),
    audience: readNullableText(row, "audience"),
    interactionType: readNullableText(row, "interaction_type"),
    learningProcess: readJsonArray(row, "learning_process"),
    createdAt: readDate(row, "created_at"),
    updatedAt: readDate(row, "updated_at")
  });
}

function toArgs(input: AppInput, now: Date) {
  const metadata = normalizeAppMetadata(input);

  return [
    input.title,
    input.summary,
    input.url,
    input.githubUrl ?? null,
    JSON.stringify(normalizeTags(input.tags)),
    input.thumbnailMode,
    input.thumbnailUrl ?? null,
    input.subject ?? null,
    input.grade ?? null,
    input.memo ?? null,
    JSON.stringify(metadata.subjects),
    JSON.stringify(metadata.gradeBands),
    metadata.audience,
    metadata.interactionType,
    JSON.stringify(metadata.learningProcess),
    now.toISOString()
  ];
}

const SELECT_COLUMNS = `
  id,
  title,
  summary,
  url,
  github_url,
  tags,
  thumbnail_mode,
  thumbnail_url,
  subject,
  grade,
  memo,
  subjects,
  grade_bands,
  audience,
  interaction_type,
  learning_process,
  created_at,
  updated_at
`;

export class TursoAppRepository implements AppRepository {
  async listPublicApps(): Promise<PublicAppRecord[]> {
    const result = await getTursoClient().execute({
      sql: `SELECT ${SELECT_COLUMNS} FROM apps ORDER BY updated_at DESC, created_at DESC`,
      args: []
    });

    return result.rows.map((row) => toPublicAppRecord(toRecord(row as TursoRow)));
  }

  async listAdminApps(): Promise<AdminAppRecord[]> {
    const result = await getTursoClient().execute({
      sql: `SELECT ${SELECT_COLUMNS} FROM apps ORDER BY updated_at DESC, created_at DESC`,
      args: []
    });

    return result.rows.map((row) => toRecord(row as TursoRow));
  }

  async getApp(id: string): Promise<AdminAppRecord | null> {
    const result = await getTursoClient().execute({
      sql: `SELECT ${SELECT_COLUMNS} FROM apps WHERE id = ? LIMIT 1`,
      args: [id]
    });
    const row = result.rows[0];

    return row ? toRecord(row as TursoRow) : null;
  }

  async createApp(input: AppInput): Promise<AdminAppRecord> {
    const id = crypto.randomUUID();
    const now = new Date();
    const args = toArgs(input, now);

    await getTursoClient().execute({
      sql: `
        INSERT INTO apps (
          id, title, summary, url, github_url, tags, thumbnail_mode,
          thumbnail_url, subject, grade, memo, subjects, grade_bands,
          audience, interaction_type, learning_process, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [id, ...args, now.toISOString()]
    });

    const record = await this.getApp(id);
    if (!record) throw new Error("Turso app insert did not return a record.");
    return record;
  }

  async updateApp(id: string, input: AppInput): Promise<AdminAppRecord> {
    const existing = await this.getApp(id);
    if (!existing) throw new Error("App not found.");

    const now = new Date();
    const args = toArgs(input, now);

    await getTursoClient().execute({
      sql: `
        UPDATE apps SET
          title = ?, summary = ?, url = ?, github_url = ?, tags = ?,
          thumbnail_mode = ?, thumbnail_url = ?, subject = ?, grade = ?,
          memo = ?, subjects = ?, grade_bands = ?, audience = ?,
          interaction_type = ?, learning_process = ?, updated_at = ?
        WHERE id = ?
      `,
      args: [...args, id]
    });

    const record = await this.getApp(id);
    if (!record) throw new Error("App not found.");
    return record;
  }

  async deleteApp(id: string): Promise<void> {
    await getTursoClient().execute({
      sql: "DELETE FROM apps WHERE id = ?",
      args: [id]
    });
  }

  async removeTag(id: string, tag: string): Promise<AdminAppRecord> {
    const existing = await this.getApp(id);
    if (!existing) throw new Error("App not found.");
    if (existing.tags.length <= 1) {
      throw new Error("앱에는 태그가 최소 1개 필요합니다.");
    }

    const nextTags = existing.tags.filter((item) => item !== tag);
    if (nextTags.length === existing.tags.length) return existing;

    await getTursoClient().execute({
      sql: "UPDATE apps SET tags = ?, updated_at = ? WHERE id = ?",
      args: [JSON.stringify(nextTags), new Date().toISOString(), id]
    });

    const record = await this.getApp(id);
    if (!record) throw new Error("App not found.");
    return record;
  }
}
