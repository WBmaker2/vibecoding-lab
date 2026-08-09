import { describe, expect, it } from "vitest";
import { getConfiguredDatabaseProvider, getTursoConfig } from "./database-provider.mjs";

describe("database provider selection", () => {
  it("prefers a complete Turso pair over the legacy Postgres URL", () => {
    expect(
      getConfiguredDatabaseProvider({
        tursoDatabaseUrl: "libsql://hvc.turso.io",
        tursoAuthToken: "token",
        postgresUrl: "postgres://legacy.example/db"
      })
    ).toBe("turso");
  });

  it("fails closed when only one Turso variable is present", () => {
    expect(() =>
      getConfiguredDatabaseProvider({
        tursoDatabaseUrl: "libsql://hvc.turso.io",
        tursoAuthToken: "",
        postgresUrl: "postgres://legacy.example/db"
      })
    ).toThrow("must be configured together");
  });

  it("returns the libSQL client shape without exposing credentials in logs", () => {
    expect(
      getTursoConfig({
        tursoDatabaseUrl: "libsql://hvc.turso.io",
        tursoAuthToken: "secret-token"
      })
    ).toEqual({ url: "libsql://hvc.turso.io", authToken: "secret-token" });
  });
});
