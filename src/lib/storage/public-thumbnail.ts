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

export function toPublicThumbnailUrl({
  thumbnailUrl
}: {
  thumbnailUrl: string | null;
}) {
  if (!thumbnailUrl) {
    return null;
  }

  if (!isSupportedThumbnailUrl(thumbnailUrl)) {
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
