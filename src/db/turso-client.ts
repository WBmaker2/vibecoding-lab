import { createClient, type Client } from "@libsql/client";
import { getOptionalEnv, hasTursoDatabase } from "@/lib/env";

const globalForTurso = globalThis as typeof globalThis & {
  hvcTursoClient?: Client;
  hvcTursoConfig?: string;
};

export function isTursoConfigured() {
  return hasTursoDatabase();
}

export function getTursoClient(): Client {
  if (!hasTursoDatabase()) {
    throw new Error(
      "TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required for the Turso adapter."
    );
  }

  const env = getOptionalEnv();
  const url = env.TURSO_DATABASE_URL as string;
  const authToken = env.TURSO_AUTH_TOKEN as string;
  const configKey = `${url}\n${authToken}`;

  if (!globalForTurso.hvcTursoClient || globalForTurso.hvcTursoConfig !== configKey) {
    globalForTurso.hvcTursoClient = createClient({ url, authToken });
    globalForTurso.hvcTursoConfig = configKey;
  }

  return globalForTurso.hvcTursoClient;
}
