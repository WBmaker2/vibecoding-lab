import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const fixtureDirectories = [];

async function loadVerifier() {
  const verifier = await import("./static-gallery-verifier.mjs").catch(
    () => null
  );

  expect(verifier?.verifyStaticGallerySnapshot).toBeTypeOf("function");
  return verifier.verifyStaticGallerySnapshot;
}

function app(thumbnailUrl) {
  return {
    id: "app-1",
    title: "App",
    summary: "Summary",
    url: "https://example.com",
    githubUrl: null,
    tags: ["교육"],
    thumbnailMode: "placeholder",
    thumbnailUrl,
    subject: null,
    grade: null,
    memo: null,
    createdAt: "2026-07-12T00:00:00.000Z",
    updatedAt: "2026-07-12T00:00:00.000Z"
  };
}

afterEach(async () => {
  await Promise.all(
    fixtureDirectories.splice(0).map((directory) =>
      fs.rm(directory, { force: true, recursive: true })
    )
  );
});

describe("static gallery verifier", () => {
  it("accepts a placeholder app with thumbnailUrl null", async () => {
    const verifyStaticGallerySnapshot = await loadVerifier();
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "hvc-verifier-"));
    const thumbnailDir = path.join(root, "app-thumbnails");
    fixtureDirectories.push(root);
    await fs.mkdir(thumbnailDir);
    const placeholderApp = app(null);

    const result = await verifyStaticGallerySnapshot({
      dbApps: [placeholderApp],
      snapshot: {
        version: 1,
        appCount: 1,
        apps: [placeholderApp],
        assetManifest: []
      },
      thumbnailDir
    });

    expect(result).toMatchObject({
      ok: true,
      thumbnailStats: {
        local: 0,
        null: 1,
        other: 0,
        remote: 0
      }
    });
  });

  it("rejects a remote thumbnail URL", async () => {
    const verifyStaticGallerySnapshot = await loadVerifier();
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "hvc-verifier-"));
    const thumbnailDir = path.join(root, "app-thumbnails");
    fixtureDirectories.push(root);
    await fs.mkdir(thumbnailDir);
    const remoteApp = app("https://images.example.com/app.png");

    const result = await verifyStaticGallerySnapshot({
      dbApps: [remoteApp],
      snapshot: {
        version: 1,
        appCount: 1,
        apps: [remoteApp],
        assetManifest: []
      },
      thumbnailDir
    });

    expect(result).toMatchObject({
      ok: false,
      thumbnailStats: { remote: 1 }
    });
  });

  it("accepts a database thumbnail materialized as a local static asset", async () => {
    const verifyStaticGallerySnapshot = await loadVerifier();
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "hvc-verifier-"));
    const thumbnailDir = path.join(root, "app-thumbnails");
    fixtureDirectories.push(root);
    await fs.mkdir(thumbnailDir);
    const bytes = Buffer.from("static-thumbnail");
    const thumbnailUrl = "/app-thumbnails/app.png";
    await fs.writeFile(path.join(thumbnailDir, "app.png"), bytes);
    const sourceApp = app("https://images.example.com/app.png");
    const snapshotApp = { ...sourceApp, thumbnailUrl };

    const result = await verifyStaticGallerySnapshot({
      dbApps: [sourceApp],
      snapshot: {
        version: 1,
        appCount: 1,
        apps: [snapshotApp],
        assetManifest: [
          {
            path: thumbnailUrl,
            size: bytes.byteLength,
            sha256: createHash("sha256").update(bytes).digest("hex")
          }
        ]
      },
      thumbnailDir
    });

    expect(result).toMatchObject({
      ok: true,
      mismatchCount: 0,
      assetIntegrity: { valid: true, reason: "assets-match" }
    });
  });

  it("rejects a missing local thumbnail reference", async () => {
    const verifyStaticGallerySnapshot = await loadVerifier();
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "hvc-verifier-"));
    const thumbnailDir = path.join(root, "app-thumbnails");
    fixtureDirectories.push(root);
    await fs.mkdir(thumbnailDir);
    const localApp = app("/app-thumbnails/missing.png");

    const result = await verifyStaticGallerySnapshot({
      dbApps: [localApp],
      snapshot: {
        version: 1,
        appCount: 1,
        apps: [localApp],
        assetManifest: [
          { path: localApp.thumbnailUrl, size: 8, sha256: "0".repeat(64) }
        ]
      },
      thumbnailDir
    });

    expect(result).toMatchObject({
      ok: false,
      missingLocalThumbnailFileCount: 1
    });
  });

  it("rejects a malformed encoded local reference without throwing", async () => {
    const verifyStaticGallerySnapshot = await loadVerifier();
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "hvc-verifier-"));
    const thumbnailDir = path.join(root, "app-thumbnails");
    fixtureDirectories.push(root);
    await fs.mkdir(thumbnailDir);
    const localApp = app("/app-thumbnails/%E0%A4%A.png");

    const result = await verifyStaticGallerySnapshot({
      dbApps: [localApp],
      snapshot: {
        version: 1,
        appCount: 1,
        apps: [localApp],
        assetManifest: []
      },
      thumbnailDir
    });

    expect(result).toMatchObject({
      ok: false,
      missingLocalThumbnailFileCount: 1
    });
  });

  it("rejects manifest drift for an existing local thumbnail", async () => {
    const verifyStaticGallerySnapshot = await loadVerifier();
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "hvc-verifier-"));
    const thumbnailDir = path.join(root, "app-thumbnails");
    fixtureDirectories.push(root);
    await fs.mkdir(thumbnailDir);
    await fs.writeFile(path.join(thumbnailDir, "app.png"), "actual-image");
    const localApp = app("/app-thumbnails/app.png");

    const result = await verifyStaticGallerySnapshot({
      dbApps: [localApp],
      snapshot: {
        version: 1,
        appCount: 1,
        apps: [localApp],
        assetManifest: [
          { path: localApp.thumbnailUrl, size: 12, sha256: "0".repeat(64) }
        ]
      },
      thumbnailDir
    });

    expect(result).toMatchObject({
      ok: false,
      assetIntegrity: { valid: false, reason: "changed-assets" }
    });
  });

  it("rejects a manifest asset that no app references", async () => {
    const verifyStaticGallerySnapshot = await loadVerifier();
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "hvc-verifier-"));
    const thumbnailDir = path.join(root, "app-thumbnails");
    fixtureDirectories.push(root);
    await fs.mkdir(thumbnailDir);
    const bytes = Buffer.from("orphan-image");
    await fs.writeFile(path.join(thumbnailDir, "orphan.png"), bytes);
    const placeholderApp = app(null);

    const result = await verifyStaticGallerySnapshot({
      dbApps: [placeholderApp],
      snapshot: {
        version: 1,
        appCount: 1,
        apps: [placeholderApp],
        assetManifest: [
          {
            path: "/app-thumbnails/orphan.png",
            size: bytes.byteLength,
            sha256: createHash("sha256").update(bytes).digest("hex")
          }
        ]
      },
      thumbnailDir
    });

    expect(result).toMatchObject({
      ok: false,
      assetIntegrity: { valid: false, reason: "extra-assets" }
    });
  });
});
