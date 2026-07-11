import { put } from "@vercel/blob";
import type { ThumbnailMode } from "@/lib/apps/types";
import { fetchLinkPreview } from "@/lib/metadata/fetch-link-preview";
import { capturePageThumbnail } from "./page-capture";
import {
  isLegacyThumbnailComputeUrl,
  isSupportedThumbnailUrl
} from "./public-thumbnail";

export const MAX_THUMBNAIL_UPLOAD_BYTES = 5 * 1024 * 1024;

interface ResolveThumbnailOptions {
  allowPlaceholderReset?: boolean;
  existingThumbnailMode?: ThumbnailMode;
  existingThumbnailUrl?: string | null;
  mode: ThumbnailMode;
  file: File | null;
  sourceUrl: string;
  thumbnailUrl?: string;
}

function toDataUrl(file: File, buffer: ArrayBuffer) {
  return `data:${file.type || "application/octet-stream"};base64,${Buffer.from(
    buffer
  ).toString("base64")}`;
}

function hasImageSignature(type: string, bytes: Uint8Array) {
  const startsWith = (signature: number[]) =>
    signature.every((byte, index) => bytes[index] === byte);
  const hasAsciiAt = (offset: number, value: string) =>
    [...value].every(
      (character, index) => bytes[offset + index] === character.charCodeAt(0)
    );

  switch (type) {
    case "image/png":
      return startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/jpeg":
      return startsWith([0xff, 0xd8, 0xff]);
    case "image/gif":
      return startsWith([0x47, 0x49, 0x46, 0x38]) &&
        (bytes[4] === 0x37 || bytes[4] === 0x39) &&
        bytes[5] === 0x61;
    case "image/webp":
      return (
        startsWith([0x52, 0x49, 0x46, 0x46]) &&
        bytes[8] === 0x57 &&
        bytes[9] === 0x45 &&
        bytes[10] === 0x42 &&
        bytes[11] === 0x50
      );
    case "image/avif":
      if (!hasAsciiAt(4, "ftyp")) {
        return false;
      }

      for (let offset = 8; offset + 4 <= bytes.length; offset += 4) {
        if (hasAsciiAt(offset, "avif") || hasAsciiAt(offset, "avis")) {
          return true;
        }
      }

      return false;
    default:
      return false;
  }
}

async function validateImageFile(file: File) {
  if (file.size > MAX_THUMBNAIL_UPLOAD_BYTES) {
    throw new Error("Thumbnail upload must be 5 MiB or smaller.");
  }

  const type = file.type.toLowerCase();

  if (![
    "image/gif",
    "image/avif",
    "image/jpeg",
    "image/png",
    "image/webp"
  ].includes(type)) {
    throw new Error("Thumbnail upload must be a supported image format.");
  }

  const buffer = new Uint8Array(await file.arrayBuffer());

  if (!hasImageSignature(type, buffer)) {
    throw new Error("Thumbnail upload has an invalid image signature.");
  }

  return buffer.buffer;
}

async function uploadFileToBlob(file: File, buffer: ArrayBuffer) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    return toDataUrl(file, buffer);
  }

  const blob = await put(`thumbnails/${Date.now()}-${file.name}`, file, {
    access: "public",
    token
  });

  return blob.url;
}

async function captureThumbnailOrNull(sourceUrl: string) {
  try {
    return await capturePageThumbnail(sourceUrl);
  } catch {
    return null;
  }
}

function normalizeThumbnailCandidate(thumbnailUrl: string | null | undefined) {
  if (
    !thumbnailUrl ||
    isLegacyThumbnailComputeUrl(thumbnailUrl) ||
    !isSupportedThumbnailUrl(thumbnailUrl)
  ) {
    return null;
  }

  return thumbnailUrl;
}

async function resolveAutoThumbnail(sourceUrl: string) {
  try {
    const preview = await fetchLinkPreview(sourceUrl);
    const previewImageUrl = normalizeThumbnailCandidate(preview.imageUrl);

    if (previewImageUrl) {
      return previewImageUrl;
    }

    const capturedImageUrl = await captureThumbnailOrNull(sourceUrl);

    return normalizeThumbnailCandidate(capturedImageUrl);
  } catch {
    const capturedImageUrl = await captureThumbnailOrNull(sourceUrl);

    return normalizeThumbnailCandidate(capturedImageUrl);
  }
}

export async function resolveThumbnailInput({
  allowPlaceholderReset = false,
  existingThumbnailMode,
  existingThumbnailUrl,
  mode,
  file,
  sourceUrl,
  thumbnailUrl
}: ResolveThumbnailOptions) {
  const validExistingThumbnailUrl = normalizeThumbnailCandidate(
    existingThumbnailUrl
  );
  const validSubmittedThumbnailUrl = normalizeThumbnailCandidate(thumbnailUrl);
  const preservedThumbnail =
    validExistingThumbnailUrl && !allowPlaceholderReset
      ? {
          thumbnailMode: existingThumbnailMode ?? ("auto" as const),
          thumbnailUrl: validExistingThumbnailUrl
        }
      : null;

  if (mode === "placeholder") {
    if (preservedThumbnail) {
      return preservedThumbnail;
    }

    return {
      thumbnailMode: "placeholder" as const,
      thumbnailUrl: null
    };
  }

  if (mode === "upload") {
    if (file && file.size > 0) {
      const buffer = await validateImageFile(file);

      return {
        thumbnailMode: "upload" as const,
        thumbnailUrl: await uploadFileToBlob(file, buffer)
      };
    }

    return {
      thumbnailMode:
        validSubmittedThumbnailUrl || preservedThumbnail?.thumbnailUrl
          ? existingThumbnailMode ?? ("upload" as const)
          : ("placeholder" as const),
      thumbnailUrl:
        validSubmittedThumbnailUrl || preservedThumbnail?.thumbnailUrl || null
    };
  }

  const autoUrl = await resolveAutoThumbnail(sourceUrl);

  return {
    thumbnailMode:
      autoUrl || validSubmittedThumbnailUrl
        ? ("auto" as const)
        : ("placeholder" as const),
    thumbnailUrl: autoUrl ?? validSubmittedThumbnailUrl ?? null
  };
}
