import { z } from "zod";

export const envSchema = z.object({
  POSTGRES_URL: z.string().min(1),
  BLOB_READ_WRITE_TOKEN: z.string().min(1),
  ADMIN_PASSWORD: z.string().min(8),
  SESSION_SECRET: z.string().min(16),
  APP_BASE_URL: z.string().url()
});

export type AppEnv = z.infer<typeof envSchema>;

const optionalEnvSchema = envSchema.partial();

export type OptionalAppEnv = z.infer<typeof optionalEnvSchema>;

export function getEnv(): AppEnv {
  return envSchema.parse({
    POSTGRES_URL: process.env.POSTGRES_URL,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    SESSION_SECRET: process.env.SESSION_SECRET,
    APP_BASE_URL: process.env.APP_BASE_URL
  });
}

export function getOptionalEnv(): OptionalAppEnv {
  return optionalEnvSchema.parse({
    POSTGRES_URL: process.env.POSTGRES_URL,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    SESSION_SECRET: process.env.SESSION_SECRET,
    APP_BASE_URL: process.env.APP_BASE_URL
  });
}

export function hasPostgresUrl() {
  return Boolean(getOptionalEnv().POSTGRES_URL?.trim());
}
