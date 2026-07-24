import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import yaml from "js-yaml";

const WORKFLOW_PATH = path.resolve(
  process.cwd(),
  ".github/workflows/sync-static-gallery.yml"
);

describe("static gallery sync workflow", () => {
  it("parses as YAML and keeps the request marker in the run name", async () => {
    const source = await fs.readFile(WORKFLOW_PATH, "utf8");
    const workflow = yaml.load(source);

    expect(workflow).toMatchObject({
      "run-name": "Sync Static Gallery :: ${{ inputs.request_marker }}"
    });
  });

  it("runs idempotent migrations after install and before export", async () => {
    const source = await fs.readFile(WORKFLOW_PATH, "utf8");
    const workflow = yaml.load(source);
    const steps = workflow.jobs.sync.steps;
    const installIndex = steps.findIndex((step) => step.run === "npm ci");
    const migrationIndex = steps.findIndex(
      (step) => step.run === "npm run db:migrate"
    );
    const exportIndex = steps.findIndex((step) =>
      step.run?.startsWith("npm run apps:export-static-gallery")
    );

    expect(migrationIndex).toBeGreaterThan(installIndex);
    expect(exportIndex).toBeGreaterThan(migrationIndex);
  });

  it("uses the canonical production domain and verifies the live app count", async () => {
    const source = await fs.readFile(WORKFLOW_PATH, "utf8");
    expect(source).toContain("https://www.vibehong.shop");
    expect(source).not.toContain("www.vivehong.shop");
    expect(source).toContain("npm run apps:verify-production-gallery");
  });

  it("delegates production deployment to the Vercel Git integration", async () => {
    const source = await fs.readFile(WORKFLOW_PATH, "utf8");

    expect(source).toContain("run: git push");
    expect(source).not.toContain("VERCEL_TOKEN");
    expect(source).not.toContain("vercel@latest");
  });
});
