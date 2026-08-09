import { z } from "zod";

const baseEnvSchema = z.object({
  POSTGRES_URL: z.string().min(1).optional(),
  TURSO_DATABASE_URL: z.string().min(1).optional(),
  TURSO_AUTH_TOKEN: z.string().min(1).optional(),
  BLOB_READ_WRITE_TOKEN: z.string().min(1),
  ADMIN_PASSWORD_HASH: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  APP_BASE_URL: z.string().url()
});

export const envSchema = baseEnvSchema.superRefine((value, context) => {
  const hasTursoUrl = Boolean(value.TURSO_DATABASE_URL);
  const hasTursoToken = Boolean(value.TURSO_AUTH_TOKEN);

  if (hasTursoUrl !== hasTursoToken) {
    context.addIssue({
      code: "custom",
      message: "TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be configured together.",
      path: [hasTursoUrl ? "TURSO_AUTH_TOKEN" : "TURSO_DATABASE_URL"]
    });
  }

  if (!value.POSTGRES_URL && !(hasTursoUrl && hasTursoToken)) {
    context.addIssue({
      code: "custom",
      message: "Configure either POSTGRES_URL or the complete Turso connection pair.",
      path: ["POSTGRES_URL"]
    });
  }
});

export type AppEnv = z.infer<typeof envSchema>;

const optionalEnvSchema = baseEnvSchema.partial();

export type OptionalAppEnv = z.infer<typeof optionalEnvSchema>;

function normalizeOptionalValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function getEnv(): AppEnv {
  return envSchema.parse({
    POSTGRES_URL: normalizeOptionalValue(process.env.POSTGRES_URL),
    TURSO_DATABASE_URL: normalizeOptionalValue(process.env.TURSO_DATABASE_URL),
    TURSO_AUTH_TOKEN: normalizeOptionalValue(process.env.TURSO_AUTH_TOKEN),
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH,
    SESSION_SECRET: process.env.SESSION_SECRET,
    APP_BASE_URL: process.env.APP_BASE_URL
  });
}

export function getOptionalEnv(): OptionalAppEnv {
  return optionalEnvSchema.parse({
    POSTGRES_URL: normalizeOptionalValue(process.env.POSTGRES_URL),
    TURSO_DATABASE_URL: normalizeOptionalValue(process.env.TURSO_DATABASE_URL),
    TURSO_AUTH_TOKEN: normalizeOptionalValue(process.env.TURSO_AUTH_TOKEN),
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

export function hasTursoDatabase() {
  const env = getOptionalEnv();
  const hasUrl = Boolean(env.TURSO_DATABASE_URL?.trim());
  const hasToken = Boolean(env.TURSO_AUTH_TOKEN?.trim());

  if (hasUrl !== hasToken) {
    throw new Error(
      "TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be configured together."
    );
  }

  return hasUrl && hasToken;
}

export type DatabaseProvider = "turso" | "postgres" | "memory";

export function getDatabaseProvider(): DatabaseProvider {
  if (hasTursoDatabase()) {
    return "turso";
  }

  if (hasPostgresUrl()) {
    return "postgres";
  }

  return "memory";
}
