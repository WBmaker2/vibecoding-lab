export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const SUPPORTED_IMAGE_MIME_TYPES = Object.freeze([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp"
]);

const MIME_TO_EXTENSION = Object.freeze({
  "image/avif": "avif",
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
});

function hasBytesAt(bytes, offset, values) {
  return values.every((value, index) => bytes[offset + index] === value);
}

function hasAsciiAt(bytes, offset, value) {
  return [...value].every(
    (character, index) => bytes[offset + index] === character.charCodeAt(0)
  );
}

function hasImageSignature(contentType, bytes) {
  switch (contentType) {
    case "image/png":
      return hasBytesAt(bytes, 0, [
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
      ]);
    case "image/jpeg":
      return hasBytesAt(bytes, 0, [0xff, 0xd8, 0xff]);
    case "image/gif":
      return (
        hasAsciiAt(bytes, 0, "GIF8") &&
        (bytes[4] === 0x37 || bytes[4] === 0x39) &&
        bytes[5] === 0x61
      );
    case "image/webp":
      return (
        hasAsciiAt(bytes, 0, "RIFF") &&
        hasAsciiAt(bytes, 8, "WEBP")
      );
    case "image/avif":
      if (!hasAsciiAt(bytes, 4, "ftyp")) {
        return false;
      }

      for (let offset = 8; offset + 4 <= bytes.length; offset += 4) {
        if (hasAsciiAt(bytes, offset, "avif") || hasAsciiAt(bytes, offset, "avis")) {
          return true;
        }
      }

      return false;
    default:
      return false;
  }
}

function toByteView(bytes) {
  if (bytes instanceof Uint8Array) {
    return bytes;
  }

  if (bytes instanceof ArrayBuffer) {
    return new Uint8Array(bytes);
  }

  return new Uint8Array(bytes);
}

export function normalizeImageMime(contentType) {
  if (typeof contentType !== "string") {
    return null;
  }

  const normalized = contentType.split(";", 1)[0]?.trim().toLowerCase();
  return SUPPORTED_IMAGE_MIME_TYPES.includes(normalized) ? normalized : null;
}

export function validateImageBytes(contentType, bytes) {
  const normalizedType = normalizeImageMime(contentType);

  if (!normalizedType) {
    throw new Error("Image must use PNG, JPEG, WebP, GIF, or AVIF MIME type.");
  }

  const view = toByteView(bytes);

  if (view.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("Image must be 5 MiB or smaller.");
  }

  if (!hasImageSignature(normalizedType, view)) {
    throw new Error("Image has an invalid magic-byte signature.");
  }

  return {
    contentType: normalizedType,
    extension: MIME_TO_EXTENSION[normalizedType]
  };
}

const DATA_IMAGE_PATTERN =
  /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i;

function inspectBase64Payload(value) {
  let compactLength = 0;
  let padding = 0;
  let sawPadding = false;

  for (const character of value) {
    if (/\s/.test(character)) {
      continue;
    }

    compactLength += 1;

    if (character === "=") {
      sawPadding = true;
      padding += 1;

      if (padding > 2) {
        return null;
      }
      continue;
    }

    if (sawPadding || !/[a-z0-9+/]/i.test(character)) {
      return null;
    }
  }

  if (!compactLength || compactLength % 4 === 1) {
    return null;
  }

  return {
    compactLength,
    decodedLength: Math.floor((compactLength * 3) / 4) - padding
  };
}

export function decodeDataImageUrl(value) {
  if (typeof value !== "string") {
    return null;
  }

  const match = value.match(DATA_IMAGE_PATTERN);

  if (!match) {
    return null;
  }

  const [, contentType, encodedPayload] = match;
  const inspected = inspectBase64Payload(encodedPayload);

  if (
    !inspected ||
    inspected.decodedLength > MAX_IMAGE_BYTES
  ) {
    return null;
  }

  const payload =
    inspected.compactLength === encodedPayload.length
      ? encodedPayload
      : encodedPayload.replace(/\s/g, "");

  try {
    const buffer = Buffer.from(payload, "base64");
    const validated = validateImageBytes(contentType, buffer);

    return {
      ...validated,
      buffer
    };
  } catch {
    return null;
  }
}
