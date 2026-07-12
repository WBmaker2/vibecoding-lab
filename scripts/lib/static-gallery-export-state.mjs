const COMPARED_FIELDS = [
  "id",
  "title",
  "summary",
  "url",
  "githubUrl",
  "tags",
  "thumbnailMode",
  "subject",
  "grade",
  "memo",
  "createdAt",
  "updatedAt"
];

const LOCAL_THUMBNAIL_PREFIX = "/app-thumbnails/";

function stableJson(value) {
  return JSON.stringify(value);
}

function isValidGeneratedAt(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
  ) {
    return false;
  }

  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}

function getReferencedThumbnailFiles(apps) {
  const files = new Set();

  for (const app of apps) {
    if (typeof app?.thumbnailUrl !== "string") {
      continue;
    }

    if (!app.thumbnailUrl.startsWith(LOCAL_THUMBNAIL_PREFIX)) {
      continue;
    }

    const filename = app.thumbnailUrl.slice(LOCAL_THUMBNAIL_PREFIX.length);
    if (!filename || filename.includes("/") || filename.includes("\\")) {
      return { files: null, reason: "invalid-local-thumbnail-reference" };
    }

    files.add(filename);
  }

  return { files, reason: null };
}

function normalizeThumbnailFiles(thumbnailFiles) {
  const files = new Set();

  for (const entry of thumbnailFiles ?? []) {
    if (typeof entry === "string") {
      files.add(
        entry.startsWith(LOCAL_THUMBNAIL_PREFIX)
          ? entry.slice(LOCAL_THUMBNAIL_PREFIX.length)
          : entry
      );
      continue;
    }

    if (
      !entry ||
      entry.type !== "file" ||
      typeof entry.name !== "string"
    ) {
      return { files: null, reason: "unexpected-thumbnail-entry" };
    }

    files.add(entry.name);
  }

  return { files, reason: null };
}

export function getReusableSnapshotDecision({
  sourceApps,
  snapshot,
  thumbnailFiles
}) {
  if (
    !Array.isArray(sourceApps) ||
    !snapshot ||
    typeof snapshot !== "object" ||
    snapshot.version !== 1 ||
    !Array.isArray(snapshot.apps) ||
    snapshot.appCount !== snapshot.apps.length
  ) {
    return { reusable: false, reason: "invalid-snapshot" };
  }

  if (!isValidGeneratedAt(snapshot.generatedAt)) {
    return { reusable: false, reason: "invalid-generated-at" };
  }

  if (sourceApps.length !== snapshot.apps.length) {
    return { reusable: false, reason: "app-count-changed" };
  }

  for (const [index, sourceApp] of sourceApps.entries()) {
    const snapshotApp = snapshot.apps[index];

    for (const field of COMPARED_FIELDS) {
      if (stableJson(sourceApp?.[field]) !== stableJson(snapshotApp?.[field])) {
        return {
          reusable: false,
          reason: `app-${index + 1}-${field}-changed`
        };
      }
    }
  }

  const referenced = getReferencedThumbnailFiles(snapshot.apps);
  if (!referenced.files) {
    return { reusable: false, reason: referenced.reason };
  }

  const materialized = normalizeThumbnailFiles(thumbnailFiles);
  if (!materialized.files) {
    return { reusable: false, reason: materialized.reason };
  }

  if (
    referenced.files.size !== materialized.files.size ||
    [...referenced.files].some((file) => !materialized.files.has(file))
  ) {
    return { reusable: false, reason: "thumbnail-set-changed" };
  }

  if (Array.isArray(snapshot.assetManifest)) {
    const manifestByPath = new Map(
      snapshot.assetManifest.map((entry) => [entry.path, entry])
    );
    const localPaths = new Set(
      [...referenced.files].map((file) => `${LOCAL_THUMBNAIL_PREFIX}${file}`)
    );

    if (
      manifestByPath.size !== snapshot.assetManifest.length ||
      manifestByPath.size !== localPaths.size ||
      [...localPaths].some((file) => !manifestByPath.has(file)) ||
      snapshot.assetManifest.some(
        (entry) =>
          !entry ||
          typeof entry.path !== "string" ||
          !/^\/app-thumbnails\/[^/]+$/.test(entry.path) ||
          !Number.isSafeInteger(entry.size) ||
          !/^[a-f0-9]{64}$/i.test(entry.sha256)
      )
    ) {
      return { reusable: false, reason: "asset-manifest-changed" };
    }

    const filesByName = new Map(
      (thumbnailFiles ?? [])
        .filter((entry) => entry && typeof entry === "object")
        .map((entry) => [entry.name, entry])
    );

    for (const [file, entry] of manifestByPath) {
      const name = file.slice(LOCAL_THUMBNAIL_PREFIX.length);
      const actual = filesByName.get(name);

      if (
        !actual ||
        actual.type !== "file" ||
        actual.size !== entry.size ||
        actual.sha256 !== entry.sha256
      ) {
        return { reusable: false, reason: "asset-manifest-changed" };
      }
    }
  } else {
    return { reusable: false, reason: "missing-asset-manifest" };
  }

  return { reusable: true, reason: "snapshot-reusable" };
}
