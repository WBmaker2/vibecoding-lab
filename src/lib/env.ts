import { z } from "zod";

export const envSchema = z.object({
  POSTGRES_URL: z.string().min(1),
  BLOB_READ_WRITE_TOKEN: z.string().min(1),
  ADMIN_PASSWORD_HASH: z.string().min(1),
  SESSION_SECRET: z.string().min(16),
  APP_BASE_URL: z.string().url()
});

export type AppEnv = z.infer<typeof envSchema>;

const optionalEnvSchema = envSchema.partial();

export type OptionalAppEnv = z.infer<typeof optionalEnvSchema>;

function normalizeOptionalValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function getEnv(): AppEnv {
  return envSchema.parse({
    POSTGRES_URL: process.env.POSTGRES_URL,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH,
    SESSION_SECRET: process.env.SESSION_SECRET,
    APP_BASE_URL: process.env.APP_BASE_URL
  });
}

export function getOptionalEnv(): OptionalAppEnv {
  return optionalEnvSchema.parse({
    POSTGRES_URL: normalizeOptionalValue(process.env.POSTGRES_URL),
    BLOB_READ_WRITE_TOKEN: normalizeOptionalValue(
      process.env.BLOB_READ_WRITE_TOKEN
    ),
    ADMIN_PASSWORD_HASH: normalizeOptionalValue(process.env.ADMIN_PASSWORD_HASH),
    SESSION_SECRET: normalizeOptionalValue(process.env.SESSION_SECRET),
    APP_BASE_URL: normalizeOptionalValue(process.env.APP_BASE_URL)
  });
}

export function hasPostgresUrl() {
  return Boolean(getOptionalEnv().POSTGRES_URL?.trim());
}
