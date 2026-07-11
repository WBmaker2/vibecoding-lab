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
  return new Set(
    [...(thumbnailFiles ?? [])].map((file) => {
      if (typeof file !== "string") {
        return String(file);
      }

      return file.startsWith(LOCAL_THUMBNAIL_PREFIX)
        ? file.slice(LOCAL_THUMBNAIL_PREFIX.length)
        : file;
    })
  );
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
  if (
    referenced.files.size !== materialized.size ||
    [...referenced.files].some((file) => !materialized.has(file))
  ) {
    return { reusable: false, reason: "thumbnail-set-changed" };
  }

  return { reusable: true, reason: "snapshot-reusable" };
}
