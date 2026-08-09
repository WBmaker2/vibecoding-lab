import postgres from "postgres";
import { getConfiguredDatabaseProvider } from "./database-provider.mjs";
import {
  createTursoClient,
  readTursoApps,
  readTursoCatalogRevision
} from "./turso-apps.mjs";

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

function toCatalogRevision(value) {
  const revision = Number(value);
  return Number.isSafeInteger(revision) && revision >= 0 ? revision : null;
}

async function fetchPostgresSnapshot(
  databaseUrl = process.env.POSTGRES_URL
) {
  if (!databaseUrl) throw new Error("POSTGRES_URL is not configured.");
  const sql = postgres(databaseUrl, { prepare: false });

  try {
    const [rows, stateRows] = await Promise.all([
      sql`
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
      `,
      sql`
        select revision
        from app_catalog_state
        where state_key = 'apps'
        limit 1
      `
    ]);

    return {
      apps: rows.map((row, index) => toPublicSnapshotApp(row, index)),
      catalogRevision: toCatalogRevision(stateRows[0]?.revision)
    };
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function fetchAppsFromPostgres(
  databaseUrl = process.env.POSTGRES_URL
) {
  return (await fetchPostgresSnapshot(databaseUrl)).apps;
}

export async function fetchAppSnapshotFromConfiguredDatabase({
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
    const client = createTursoClient({
      databaseUrl: tursoDatabaseUrl,
      authToken
    });
    const [apps, catalogRevision] = await Promise.all([
      readTursoApps({ client }),
      readTursoCatalogRevision({ client })
    ]);

    return {
      apps: apps.map(toPublicSnapshotApp),
      catalogRevision
    };
  }

  if (provider === "postgres") {
    return fetchPostgresSnapshot(databaseUrl);
  }

  throw new Error(
    "No database is configured. Set Turso variables or POSTGRES_URL, or provide --backup."
  );
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
  return (
    await fetchAppSnapshotFromConfiguredDatabase({
      databaseUrl,
      tursoDatabaseUrl,
      authToken,
      provider
    })
  ).apps;
}
