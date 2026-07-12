import { decodeDataImageUrl } from "../../src/lib/security/image-policy.mjs";

function prepareThumbnail(app) {
  const thumbnailUrl = app?.thumbnailUrl ?? null;

  if (typeof thumbnailUrl !== "string" || !thumbnailUrl.startsWith("data:")) {
    return {
      thumbnailMode: app?.thumbnailMode,
      thumbnailUrl
    };
  }

  if (decodeDataImageUrl(thumbnailUrl)) {
    return {
      thumbnailMode: app?.thumbnailMode,
      thumbnailUrl
    };
  }

  return {
    thumbnailMode: "placeholder",
    thumbnailUrl: null
  };
}

export function prepareBackupApps(payload) {
  if (!payload || !Array.isArray(payload.apps)) {
    throw new Error("Backup JSON must contain an apps array.");
  }

  return payload.apps.map((app) => ({
    ...app,
    ...prepareThumbnail(app)
  }));
}
