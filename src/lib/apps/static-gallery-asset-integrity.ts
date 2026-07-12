import { createHash } from "node:crypto";
import type { Dirent } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type {
  StaticGalleryAssetIntegrity,
  StaticGalleryAssetManifest,
  StaticGalleryBaseline
} from "./static-gallery-sync-state";

const STATIC_THUMBNAIL_DIR = path.resolve(
  process.cwd(),
  "public",
  "app-thumbnails"
);

function normalizeManifest(manifest: StaticGalleryAssetManifest) {
  return [...manifest].sort((left, right) => left.path.localeCompare(right.path));
}

export function compareStaticGalleryAssetManifest(
  expected: StaticGalleryAssetManifest,
  actual: StaticGalleryAssetManifest
): StaticGalleryAssetIntegrity {
  const expectedEntries = normalizeManifest(expected);
  const actualEntries = normalizeManifest(actual);
  const expectedPaths = new Set(expectedEntries.map((entry) => entry.path));
  const actualPaths = new Set(actualEntries.map((entry) => entry.path));

  if ([...expectedPaths].some((entry) => !actualPaths.has(entry))) {
    return { valid: false, reason: "missing-assets" };
  }

  if ([...actualPaths].some((entry) => !expectedPaths.has(entry))) {
    return { valid: false, reason: "extra-assets" };
  }

  const expectedByPath = new Map(
    expectedEntries.map((entry) => [entry.path, entry])
  );

  if (
    actualEntries.some((entry) => {
      const expectedEntry = expectedByPath.get(entry.path);
      return (
        !expectedEntry ||
        expectedEntry.size !== entry.size ||
        expectedEntry.sha256 !== entry.sha256
      );
    })
  ) {
    return { valid: false, reason: "changed-assets" };
  }

  return { valid: true, reason: "assets-match" };
}

export async function getStaticGalleryAssetIntegrity(
  baseline: StaticGalleryBaseline
): Promise<StaticGalleryAssetIntegrity> {
  let entries: Dirent[];

  try {
    entries = await fs.readdir(STATIC_THUMBNAIL_DIR, { withFileTypes: true });
  } catch {
    entries = [];
  }

  const actual: StaticGalleryAssetManifest = [];

  for (const entry of entries) {
    if (!entry.isFile()) {
      return { valid: false, reason: "non-file-assets" };
    }

    const filePath = path.join(STATIC_THUMBNAIL_DIR, entry.name);
    const buffer = await fs.readFile(filePath);
    actual.push({
      path: `/app-thumbnails/${entry.name}`,
      size: buffer.byteLength,
      sha256: createHash("sha256").update(buffer).digest("hex")
    });
  }

  return compareStaticGalleryAssetManifest(baseline.assetManifest, actual);
}
