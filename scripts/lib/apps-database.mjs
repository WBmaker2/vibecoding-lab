import postgres from "postgres";
import { getConfiguredDatabaseProvider } from "./database-provider.mjs";
import { readTursoApps } from "./turso-apps.mjs";

function normalizeDateValue(value) {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function coerceText(value) {
  return typeof value === "string" ? value : "";
}

function coerceNullableText(value) {
  return value == null ? null : coerceText(value);
}

function coerceTags(value) {
  return Array.isArray(value)
    ? value.filter((tag) => typeof tag === "string")
    : [];
}

function normalizeThumbnailMode(value) {
  return ["auto", "upload", "placeholder"].includes(value)
    ? value
    : "placeholder";
}

export function toPublicSnapshotApp(raw, index) {
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
    subjects: coerceTags(raw.subjects),
    gradeBands: coerceTags(raw.gradeBands),
    audience: coerceNullableText(raw.audience),
    interactionType: coerceNullableText(raw.interactionType),
    learningProcess: coerceTags(raw.learningProcess),
    createdAt: normalizeDateValue(raw.createdAt),
    updatedAt: normalizeDateValue(raw.updatedAt)
  };
}

export async function fetchAppsFromPostgres(databaseUrl = process.env.POSTGRES_URL) {
  if (!databaseUrl) throw new Error("POSTGRES_URL is not configured.");
  const sql = postgres(databaseUrl, { prepare: false });

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
        subjects,
        grade_bands as "gradeBands",
        audience,
        interaction_type as "interactionType",
        learning_process as "learningProcess",
        created_at as "createdAt",
        updated_at as "updatedAt"
      from apps
      order by updated_at desc, created_at desc
    `;

    return rows.map((row, index) => toPublicSnapshotApp(row, index));
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function fetchAppsFromConfiguredDatabase({
  databaseUrl = process.env.POSTGRES_URL,
  tursoDatabaseUrl = process.env.TURSO_DATABASE_URL,
  authToken = process.env.TURSO_AUTH_TOKEN,
  provider = getConfiguredDatabaseProvider({
    postgresUrl: databaseUrl,
    tursoDatabaseUrl,
    tursoAuthToken: authToken
  })
} = {}) {
  if (provider === "turso") {
    const apps = await readTursoApps({
      databaseUrl: tursoDatabaseUrl,
      authToken
    });
    return apps.map(toPublicSnapshotApp);
  }

  if (provider === "postgres") {
    return fetchAppsFromPostgres(databaseUrl);
  }

  throw new Error(
    "No database is configured. Set Turso variables or POSTGRES_URL, or provide --backup."
  );
}
