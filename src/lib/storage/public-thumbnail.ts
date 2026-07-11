const EMBEDDED_IMAGE_URL_PATTERN = /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i;
const LEGACY_THUMBNAIL_BASE_URL = "https://legacy-thumbnail.invalid";

export function isEmbeddedThumbnailUrl(thumbnailUrl: string | null | undefined) {
  return Boolean(thumbnailUrl && EMBEDDED_IMAGE_URL_PATTERN.test(thumbnailUrl));
}

export function isSupportedThumbnailUrl(
  thumbnailUrl: string | null | undefined
) {
  if (!thumbnailUrl) {
    return false;
  }

  if (isEmbeddedThumbnailUrl(thumbnailUrl)) {
    return true;
  }

  try {
    const parsedUrl = new URL(thumbnailUrl);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeThumbnailPath(thumbnailUrl: string) {
  try {
    const pathname = decodeURIComponent(
      new URL(thumbnailUrl, LEGACY_THUMBNAIL_BASE_URL).pathname
    );
    const segments: string[] = [];

    for (const segment of pathname.split("/")) {
      if (!segment || segment === ".") {
        continue;
      }

      if (segment === "..") {
        segments.pop();
        continue;
      }

      segments.push(segment);
    }

    const normalized = `/${segments.join("/")}`;
    return normalized.length > 1
      ? normalized.replace(/\/+$/, "")
      : normalized;
  } catch {
    return null;
  }
}

export function isLegacyThumbnailComputeUrl(
  thumbnailUrl: string | null | undefined
) {
  if (!thumbnailUrl?.trim()) {
    return false;
  }

  const pathname = normalizeThumbnailPath(thumbnailUrl.trim());

  return Boolean(
    pathname === "/api/thumbnail" ||
      pathname === "/api/app-thumbnail" ||
      pathname?.startsWith("/api/app-thumbnail/")
  );
}

export function toPublicThumbnailUrl({
  thumbnailUrl
}: {
  thumbnailUrl: string | null;
}) {
  if (!thumbnailUrl) {
    return null;
  }

  if (
    isLegacyThumbnailComputeUrl(thumbnailUrl) ||
    !isSupportedThumbnailUrl(thumbnailUrl)
  ) {
    return null;
  }

  return isEmbeddedThumbnailUrl(thumbnailUrl) ? null : thumbnailUrl;
}

export function decodeEmbeddedThumbnailUrl(thumbnailUrl: string) {
  const match = thumbnailUrl.match(EMBEDDED_IMAGE_URL_PATTERN);

  if (!match) {
    return null;
  }

  const [, contentType, base64Payload] = match;
  const buffer = Buffer.from(base64Payload, "base64");

  if (!buffer.byteLength) {
    return null;
  }

  return {
    contentType,
    buffer
  };
}
