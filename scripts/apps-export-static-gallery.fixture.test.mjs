// @vitest-environment node

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

const app = {
  id: "alpha",
  title: "Alpha",
  summary: "First app",
  url: "https://example.com/alpha",
  githubUrl: null,
  tags: ["math"],
  thumbnailMode: "upload",
  thumbnailUrl: "/app-thumbnails/alpha.png",
  subject: "Math",
  grade: "Grade 3",
  memo: null,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-02T00:00:00.000Z"
};

function runExporter({
  backup,
  outputJson,
  outputThumbnailDir,
  baseUrl = "https://static.example.test"
}) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        "scripts/apps-export-static-gallery.mjs",
        "--backup",
        backup,
        "--base-url",
        baseUrl
      ],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          STATIC_GALLERY_OUTPUT_JSON_PATH: outputJson,
          STATIC_GALLERY_OUTPUT_THUMBNAIL_DIR: outputThumbnailDir
        },
        stdio: ["ignore", "pipe", "pipe"]
      }
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

async function readFixtureState(outputJson, outputThumbnailDir) {
  const json = await fs.readFile(outputJson);
  const thumbnail = await fs.readFile(
    path.join(outputThumbnailDir, "alpha.png")
  );

  return {
    generatedAt: JSON.parse(json.toString("utf8")).generatedAt,
    json,
    thumbnailChecksum: createHash("sha256").update(thumbnail).digest("hex")
  };
}

describe("static gallery exporter thumbnail entry safety", () => {
  it("reuses an existing local snapshot asset for a legacy internal URL without fetching it", async () => {
    const fixture = await fs.mkdtemp(
      path.join(os.tmpdir(), "hvc-gallery-export-legacy-reuse-test-")
    );
    const outputJson = path.join(fixture, "src", "data", "public-apps.json");
    const outputThumbnailDir = path.join(fixture, "public", "app-thumbnails");
    const backup = path.join(fixture, "backup.json");
    const legacyApp = {
      ...app,
      title: "Legacy Alpha",
      thumbnailUrl: "/api/thumbnail?host=example.com"
    };
    let requests = 0;
    const server = createServer((_request, response) => {
      requests += 1;
      response.writeHead(200, { "content-type": "image/png" });
      response.end("unexpected network fetch");
    });

    try {
      await fs.mkdir(path.dirname(outputJson), { recursive: true });
      await fs.mkdir(outputThumbnailDir, { recursive: true });
      await fs.writeFile(
        outputJson,
        JSON.stringify(
          {
            version: 1,
            generatedAt: "2026-07-10T00:00:00.000Z",
            appCount: 1,
            apps: [app]
          },
          null,
          2
        )
      );
      await fs.writeFile(backup, JSON.stringify({ apps: [legacyApp] }, null, 2));
      await fs.writeFile(path.join(outputThumbnailDir, "alpha.png"), "alpha");
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      const address = server.address();
      const baseUrl = `http://127.0.0.1:${address.port}`;

      const result = await runExporter({
        backup,
        outputJson,
        outputThumbnailDir,
        baseUrl
      });
      const snapshot = JSON.parse(await fs.readFile(outputJson, "utf8"));

      expect(result.code).toBe(0);
      expect(requests).toBe(0);
      expect(snapshot.apps[0].thumbnailUrl).toBe(
        "/app-thumbnails/alpha.png"
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
      await fs.rm(fixture, { recursive: true, force: true });
    }
  });

  it("clears a legacy internal URL when no prior local asset exists without fetching it", async () => {
    const fixture = await fs.mkdtemp(
      path.join(os.tmpdir(), "hvc-gallery-export-legacy-clear-test-")
    );
    const outputJson = path.join(fixture, "src", "data", "public-apps.json");
    const outputThumbnailDir = path.join(fixture, "public", "app-thumbnails");
    const backup = path.join(fixture, "backup.json");
    const legacyApp = {
      ...app,
      title: "Legacy Alpha",
      thumbnailUrl: "/api/app-thumbnail/alpha/1777800000000"
    };
    let requests = 0;
    const server = createServer((_request, response) => {
      requests += 1;
      response.writeHead(200, { "content-type": "image/png" });
      response.end("unexpected network fetch");
    });

    try {
      await fs.mkdir(path.dirname(outputJson), { recursive: true });
      await fs.mkdir(outputThumbnailDir, { recursive: true });
      await fs.writeFile(
        outputJson,
        JSON.stringify(
          {
            version: 1,
            generatedAt: "2026-07-10T00:00:00.000Z",
            appCount: 1,
            apps: [{ ...app, thumbnailUrl: null }]
          },
          null,
          2
        )
      );
      await fs.writeFile(backup, JSON.stringify({ apps: [legacyApp] }, null, 2));
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      const address = server.address();
      const baseUrl = `http://127.0.0.1:${address.port}`;

      const result = await runExporter({
        backup,
        outputJson,
        outputThumbnailDir,
        baseUrl
      });
      const snapshot = JSON.parse(await fs.readFile(outputJson, "utf8"));

      expect(result.code).toBe(0);
      expect(requests).toBe(0);
      expect(snapshot.apps[0].thumbnailUrl).toBeNull();
    } finally {
      await new Promise((resolve) => server.close(resolve));
      await fs.rm(fixture, { recursive: true, force: true });
    }
  });

  it("treats symlinks and directories as changes and removes them without following links", async () => {
    const fixture = await fs.mkdtemp(
      path.join(os.tmpdir(), "hvc-gallery-export-test-")
    );
    const outputJson = path.join(fixture, "src", "data", "public-apps.json");
    const outputThumbnailDir = path.join(fixture, "public", "app-thumbnails");
    const backup = path.join(fixture, "backup.json");
    const symlinkTarget = path.join(fixture, "symlink-target.txt");
    const orphanSymlink = path.join(outputThumbnailDir, "orphan-link");
    const orphanDirectory = path.join(outputThumbnailDir, "orphan-directory");

    try {
      await fs.mkdir(path.dirname(outputJson), { recursive: true });
      await fs.mkdir(outputThumbnailDir, { recursive: true });
      await fs.writeFile(
        outputJson,
        JSON.stringify(
          {
            version: 1,
            generatedAt: "2026-07-10T00:00:00.000Z",
            appCount: 1,
            apps: [app]
          },
          null,
          2
        )
      );
      await fs.writeFile(backup, JSON.stringify({ apps: [app] }, null, 2));
      await fs.writeFile(path.join(outputThumbnailDir, "alpha.png"), "alpha");
      await fs.writeFile(symlinkTarget, "target remains");
      await fs.symlink(symlinkTarget, orphanSymlink);
      await fs.mkdir(path.join(orphanDirectory, "nested"), { recursive: true });
      await fs.writeFile(path.join(orphanDirectory, "nested", "entry"), "nested");

      const result = await runExporter({
        backup,
        outputJson,
        outputThumbnailDir
      });

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("gallery-export changed=true");
      await expect(fs.lstat(orphanSymlink)).rejects.toMatchObject({
        code: "ENOENT"
      });
      await expect(fs.lstat(orphanDirectory)).rejects.toMatchObject({
        code: "ENOENT"
      });
      await expect(fs.readFile(symlinkTarget, "utf8")).resolves.toBe(
        "target remains"
      );
      await expect(fs.readFile(path.join(outputThumbnailDir, "alpha.png"), "utf8")).resolves.toBe(
        "alpha"
      );
    } finally {
      await fs.rm(fixture, { recursive: true, force: true });
    }
  });

  it("preserves unchanged fixture bytes across two runs and exports changed DB fields", async () => {
    const fixture = await fs.mkdtemp(
      path.join(os.tmpdir(), "hvc-gallery-export-noop-test-")
    );
    const outputJson = path.join(fixture, "src", "data", "public-apps.json");
    const outputThumbnailDir = path.join(fixture, "public", "app-thumbnails");
    const backup = path.join(fixture, "backup.json");

    try {
      await fs.mkdir(path.dirname(outputJson), { recursive: true });
      await fs.mkdir(outputThumbnailDir, { recursive: true });
      await fs.writeFile(
        outputJson,
        JSON.stringify(
          {
            version: 1,
            generatedAt: "2026-07-10T00:00:00.000Z",
            appCount: 1,
            apps: [app]
          },
          null,
          2
        )
      );
      await fs.writeFile(backup, JSON.stringify({ apps: [app] }, null, 2));
      await fs.writeFile(path.join(outputThumbnailDir, "alpha.png"), "alpha");

      const initial = await readFixtureState(outputJson, outputThumbnailDir);
      const first = await runExporter({
        backup,
        outputJson,
        outputThumbnailDir
      });
      const afterFirst = await readFixtureState(outputJson, outputThumbnailDir);

      expect(first.code).toBe(0);
      expect(first.stdout).toContain("gallery-export changed=false");
      expect(afterFirst.json.equals(initial.json)).toBe(true);
      expect(afterFirst.generatedAt).toBe(initial.generatedAt);
      expect(afterFirst.thumbnailChecksum).toBe(initial.thumbnailChecksum);

      const second = await runExporter({
        backup,
        outputJson,
        outputThumbnailDir
      });
      const afterSecond = await readFixtureState(outputJson, outputThumbnailDir);

      expect(second.code).toBe(0);
      expect(second.stdout).toContain("gallery-export changed=false");
      expect(afterSecond.json.equals(initial.json)).toBe(true);
      expect(afterSecond.generatedAt).toBe(initial.generatedAt);
      expect(afterSecond.thumbnailChecksum).toBe(initial.thumbnailChecksum);

      const changedBackup = JSON.parse(await fs.readFile(backup, "utf8"));
      changedBackup.apps[0].title = "Changed from DB";
      await fs.writeFile(backup, JSON.stringify(changedBackup, null, 2));

      const changed = await runExporter({
        backup,
        outputJson,
        outputThumbnailDir
      });
      const changedSnapshot = JSON.parse(await fs.readFile(outputJson, "utf8"));

      expect(changed.code).toBe(0);
      expect(changed.stdout).toContain("gallery-export changed=true");
      expect(changedSnapshot.apps[0].title).toBe("Changed from DB");
    } finally {
      await fs.rm(fixture, { recursive: true, force: true });
    }
  });
});
