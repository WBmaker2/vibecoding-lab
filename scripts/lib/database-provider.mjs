function normalized(value) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || undefined;
}

export function getConfiguredDatabaseProvider({
  tursoDatabaseUrl = process.env.TURSO_DATABASE_URL,
  tursoAuthToken = process.env.TURSO_AUTH_TOKEN,
  postgresUrl = process.env.POSTGRES_URL
} = {}) {
  const url = normalized(tursoDatabaseUrl);
  const token = normalized(tursoAuthToken);

  if (Boolean(url) !== Boolean(token)) {
    throw new Error(
      "TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be configured together."
    );
  }

  if (url && token) return "turso";
  if (normalized(postgresUrl)) return "postgres";
  return "none";
}

export function getTursoConfig({
  tursoDatabaseUrl = process.env.TURSO_DATABASE_URL,
  tursoAuthToken = process.env.TURSO_AUTH_TOKEN
} = {}) {
  const databaseUrl = normalized(tursoDatabaseUrl);
  const authToken = normalized(tursoAuthToken);

  if (!databaseUrl || !authToken) {
    throw new Error(
      "TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required for Turso scripts."
    );
  }

  return { url: databaseUrl, authToken };
}
