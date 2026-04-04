import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { getEnv } from "@/lib/env";

export function getDb() {
  const env = getEnv();
  const client = postgres(env.POSTGRES_URL, {
    prepare: false
  });

  return drizzle(client);
}
