import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getMigrationPlan } from "./db-migrate.mjs";

const fixtures = [];

afterEach(async () => {
  await Promise.all(
    fixtures.splice(0).map((directory) => fs.rm(directory, { force: true, recursive: true }))
  );
});

describe("database migration selection", () => {
  it("selects ordered unapplied migrations without opening a database", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "hvc-migrations-"));
    fixtures.push(directory);
    await Promise.all([
      fs.writeFile(path.join(directory, "0002_static_gallery_sync_leases.sql"), "two"),
      fs.writeFile(path.join(directory, "0000_chemical_morph.sql"), "zero"),
      fs.writeFile(path.join(directory, "0001_add_github_url.sql"), "one"),
      fs.writeFile(path.join(directory, "README.md"), "ignored")
    ]);

    await expect(
      getMigrationPlan({ directory, applied: new Set(["0000_chemical_morph"]) })
    ).resolves.toEqual([
      { name: "0001_add_github_url", path: path.join(directory, "0001_add_github_url.sql") },
      { name: "0002_static_gallery_sync_leases", path: path.join(directory, "0002_static_gallery_sync_leases.sql") }
    ]);
  });

  it("returns no pending work for an already recorded migration set", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "hvc-migrations-empty-"));
    fixtures.push(directory);
    await fs.writeFile(path.join(directory, "0002_static_gallery_sync_leases.sql"), "two");

    await expect(
      getMigrationPlan({
        directory,
        applied: new Set(["0002_static_gallery_sync_leases"])
      })
    ).resolves.toEqual([]);
  });

  it("ships idempotent SQL for clean and existing schemas", async () => {
    const migrationDirectory = path.resolve(process.cwd(), "src/db/migrations");
    const [base, github, leases, metadata, catalogState] = await Promise.all([
      fs.readFile(path.join(migrationDirectory, "0000_chemical_morph.sql"), "utf8"),
      fs.readFile(path.join(migrationDirectory, "0001_add_github_url.sql"), "utf8"),
      fs.readFile(path.join(migrationDirectory, "0002_static_gallery_sync_leases.sql"), "utf8"),
      fs.readFile(path.join(migrationDirectory, "0003_structured_app_metadata.sql"), "utf8"),
      fs.readFile(path.join(migrationDirectory, "0004_app_catalog_state.sql"), "utf8")
    ]);

    expect(base).toContain("CREATE TABLE IF NOT EXISTS");
    expect(github).toContain("ADD COLUMN IF NOT EXISTS");
    expect(leases).toContain("CREATE TABLE IF NOT EXISTS");
    expect(metadata.match(/ADD COLUMN IF NOT EXISTS/g)).toHaveLength(5);
    expect(catalogState).toContain('CREATE TABLE IF NOT EXISTS "app_catalog_state"');
    expect(catalogState).toContain("ON CONFLICT");
  });
});
