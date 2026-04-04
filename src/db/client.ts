import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { hasPostgresUrl } from "@/lib/env";

const globalForDb = globalThis as typeof globalThis & {
  hvcSqlClient?: ReturnType<typeof postgres>;
  hvcDb?: ReturnType<typeof drizzle>;
};

export function isDatabaseConfigured() {
  return hasPostgresUrl();
}

export function getDb() {
  const databaseUrl = process.env.POSTGRES_URL;

  if (!databaseUrl) {
    throw new Error("POSTGRES_URL is not configured.");
  }

  if (!globalForDb.hvcSqlClient || !globalForDb.hvcDb) {
    const client = postgres(databaseUrl, {
      prepare: false
    });

    globalForDb.hvcSqlClient = client;
    globalForDb.hvcDb = drizzle(client);
  }

  return globalForDb.hvcDb;
}
