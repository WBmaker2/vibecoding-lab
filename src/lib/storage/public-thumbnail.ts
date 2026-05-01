const EMBEDDED_IMAGE_URL_PATTERN = /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i;

export function isEmbeddedThumbnailUrl(thumbnailUrl: string | null | undefined) {
  return Boolean(thumbnailUrl && EMBEDDED_IMAGE_URL_PATTERN.test(thumbnailUrl));
}

export function buildPublicThumbnailUrl(id: string, updatedAt: Date) {
  return `/api/app-thumbnail/${encodeURIComponent(id)}/${updatedAt.getTime()}`;
}

export function toPublicThumbnailUrl({
  id,
  thumbnailUrl,
  updatedAt
}: {
  id: string;
  thumbnailUrl: string | null;
  updatedAt: Date;
}) {
  if (!thumbnailUrl) {
    return null;
  }

  if (!isEmbeddedThumbnailUrl(thumbnailUrl)) {
    return thumbnailUrl;
  }

  return buildPublicThumbnailUrl(id, updatedAt);
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
