const EMBEDDED_IMAGE_URL_PATTERN = /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i;

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

function getRawThumbnailPath(thumbnailUrl: string) {
  const match =
    thumbnailUrl.match(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]*(\/[^?#]*)?/i) ??
    thumbnailUrl.match(/^\/\/[^/?#]*(\/[^?#]*)?/);

  return match?.[1] ?? thumbnailUrl.split(/[?#]/)[0];
}

function normalizeThumbnailPath(thumbnailUrl: string) {
  try {
    const pathname = decodeURIComponent(getRawThumbnailPath(thumbnailUrl));
    const segments: string[] = [];
    let hasUnsafeTraversal = false;

    for (const segment of pathname.split("/")) {
      if (!segment) {
        continue;
      }

      if (segment === ".") {
        hasUnsafeTraversal = true;
        continue;
      }

      if (segment === "..") {
        hasUnsafeTraversal = true;
        segments.pop();
        continue;
      }

      segments.push(segment);
    }

    const normalized = `/${segments.join("/")}`;
    return {
      hasUnsafeTraversal,
      pathname:
        normalized.length > 1
          ? normalized.replace(/\/+$/, "")
          : normalized
    };
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

  const normalizedPath = normalizeThumbnailPath(thumbnailUrl.trim());

  if (!normalizedPath || normalizedPath.hasUnsafeTraversal) {
    return false;
  }

  if (normalizedPath.pathname === "/api/thumbnail") {
    return true;
  }

  if (!normalizedPath.pathname.startsWith("/api/app-thumbnail/")) {
    return false;
  }

  return (
    normalizedPath.pathname
      .slice("/api/app-thumbnail/".length)
      .split("/")
      .filter(Boolean).length === 2
  );
}

export function isUnsafeThumbnailUrl(
  thumbnailUrl: string | null | undefined
) {
  if (!thumbnailUrl?.trim()) {
    return false;
  }

  const normalizedPath = normalizeThumbnailPath(thumbnailUrl.trim());

  return !normalizedPath || normalizedPath.hasUnsafeTraversal;
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
    isUnsafeThumbnailUrl(thumbnailUrl) ||
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
