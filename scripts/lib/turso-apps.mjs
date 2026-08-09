import { createClient } from "@libsql/client";
import { getTursoConfig } from "./database-provider.mjs";

const VALID_THUMBNAIL_MODES = new Set(["auto", "upload", "placeholder"]);

const APP_COLUMNS = [
  "id",
  "title",
  "summary",
  "url",
  "github_url",
  "tags",
  "thumbnail_mode",
  "thumbnail_url",
  "subject",
  "grade",
  "memo",
  "subjects",
  "grade_bands",
  "audience",
  "interaction_type",
  "learning_process",
  "created_at",
  "updated_at"
];

function textOrNull(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text || null;
}

function requiredText(value, field, index) {
  const text = textOrNull(value);
  if (!text) throw new Error(`Backup app ${index + 1} is missing ${field}.`);
  return text;
}

function arrayOfText(value, field, index) {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`Backup app ${index + 1} has an invalid ${field} array.`);
  }
  return value.map((item) => item.trim()).filter(Boolean);
}

function isoDate(value, field, index) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Backup app ${index + 1} has an invalid ${field}.`);
  }
  return date.toISOString();
}

export function normalizeTursoApp(app, index = 0) {
  if (!app || typeof app !== "object") {
    throw new Error(`Backup app ${index + 1} must be an object.`);
  }

  const thumbnailMode = VALID_THUMBNAIL_MODES.has(app.thumbnailMode)
    ? app.thumbnailMode
    : "placeholder";

  return {
    id: requiredText(app.id, "id", index),
    title: requiredText(app.title, "title", index),
    summary: requiredText(app.summary, "summary", index),
    url: requiredText(app.url, "url", index),
    githubUrl: textOrNull(app.githubUrl),
    tags: arrayOfText(app.tags, "tags", index),
    thumbnailMode,
    thumbnailUrl: textOrNull(app.thumbnailUrl),
    subject: textOrNull(app.subject),
    grade: textOrNull(app.grade),
    memo: textOrNull(app.memo),
    subjects: arrayOfText(app.subjects, "subjects", index),
    gradeBands: arrayOfText(app.gradeBands, "gradeBands", index),
    audience: textOrNull(app.audience),
    interactionType: textOrNull(app.interactionType),
    learningProcess: arrayOfText(app.learningProcess, "learningProcess", index),
    createdAt: isoDate(app.createdAt, "createdAt", index),
    updatedAt: isoDate(app.updatedAt, "updatedAt", index)
  };
}

function readJsonArray(value, field) {
  if (value === null || value === undefined || value === "") return [];
  if (Array.isArray(value)) return value.filter((item) => typeof item === "string");

  let parsed;
  try {
    parsed = JSON.parse(String(value));
  } catch {
    throw new Error(`Turso column ${field} contains invalid JSON.`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error(`Turso column ${field} must contain a JSON array.`);
  }

  return parsed.filter((item) => typeof item === "string");
}

function rowToApp(row, index) {
  return normalizeTursoApp(
    {
      id: row.id,
      title: row.title,
      summary: row.summary,
      url: row.url,
      githubUrl: row.github_url,
      tags: readJsonArray(row.tags, "tags"),
      thumbnailMode: row.thumbnail_mode,
      thumbnailUrl: row.thumbnail_url,
      subject: row.subject,
      grade: row.grade,
      memo: row.memo,
      subjects: readJsonArray(row.subjects, "subjects"),
      gradeBands: readJsonArray(row.grade_bands, "grade_bands"),
      audience: row.audience,
      interactionType: row.interaction_type,
      learningProcess: readJsonArray(row.learning_process, "learning_process"),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    },
    index
  );
}

export function createTursoClient({ databaseUrl, authToken } = {}) {
  return createClient(getTursoConfig({ databaseUrl, authToken }));
}

export async function readTursoApps({ client, databaseUrl, authToken } = {}) {
  const target = client ?? createTursoClient({ databaseUrl, authToken });
  const result = await target.execute({
    sql: `SELECT ${APP_COLUMNS.join(", ")} FROM apps ORDER BY updated_at DESC, created_at DESC`,
    args: []
  });

  return result.rows.map((row, index) => rowToApp(row, index));
}

export function toTursoInsertStatement(app, { upsert = false } = {}) {
  const normalized = normalizeTursoApp(app);

  return {
    sql: `
      INSERT INTO apps (
        id, title, summary, url, github_url, tags, thumbnail_mode,
        thumbnail_url, subject, grade, memo, subjects, grade_bands,
        audience, interaction_type, learning_process, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ${
        upsert
          ? `ON CONFLICT (id) DO UPDATE SET
              title = excluded.title,
              summary = excluded.summary,
              url = excluded.url,
              github_url = excluded.github_url,
              tags = excluded.tags,
              thumbnail_mode = excluded.thumbnail_mode,
              thumbnail_url = excluded.thumbnail_url,
              subject = excluded.subject,
              grade = excluded.grade,
              memo = excluded.memo,
              subjects = excluded.subjects,
              grade_bands = excluded.grade_bands,
              audience = excluded.audience,
              interaction_type = excluded.interaction_type,
              learning_process = excluded.learning_process,
              created_at = excluded.created_at,
              updated_at = excluded.updated_at`
          : ""
      }
    `,
    args: [
      normalized.id,
      normalized.title,
      normalized.summary,
      normalized.url,
      normalized.githubUrl,
      JSON.stringify(normalized.tags),
      normalized.thumbnailMode,
      normalized.thumbnailUrl,
      normalized.subject,
      normalized.grade,
      normalized.memo,
      JSON.stringify(normalized.subjects),
      JSON.stringify(normalized.gradeBands),
      normalized.audience,
      normalized.interactionType,
      JSON.stringify(normalized.learningProcess),
      normalized.createdAt,
      normalized.updatedAt
    ]
  };
}

const COMPARISON_FIELDS = [
  "id",
  "title",
  "summary",
  "url",
  "githubUrl",
  "tags",
  "thumbnailMode",
  "thumbnailUrl",
  "subject",
  "grade",
  "memo",
  "subjects",
  "gradeBands",
  "audience",
  "interactionType",
  "learningProcess",
  "createdAt",
  "updatedAt"
];

export function compareTursoApps(sourceApps, targetApps) {
  const source = sourceApps.map((app, index) => normalizeTursoApp(app, index));
  const target = targetApps.map((app, index) => normalizeTursoApp(app, index));
  const sourceById = new Map(source.map((app) => [app.id, app]));
  const targetById = new Map(target.map((app) => [app.id, app]));
  const mismatches = [];

  for (const [id, expected] of sourceById) {
    const actual = targetById.get(id);
    if (!actual) {
      mismatches.push({ id, reason: "missing-in-turso" });
      continue;
    }

    const fields = COMPARISON_FIELDS.filter(
      (field) => JSON.stringify(expected[field]) !== JSON.stringify(actual[field])
    );
    if (fields.length > 0) mismatches.push({ id, reason: "field-mismatch", fields });
  }

  for (const id of targetById.keys()) {
    if (!sourceById.has(id)) mismatches.push({ id, reason: "extra-in-turso" });
  }

  return {
    ok: mismatches.length === 0 && source.length === target.length,
    sourceCount: source.length,
    targetCount: target.length,
    mismatches
  };
}
