import { put } from "@vercel/blob";
import type { ThumbnailMode } from "@/lib/apps/types";
import { fetchLinkPreview } from "@/lib/metadata/fetch-link-preview";
import {
  MAX_IMAGE_BYTES,
  validateImageBytes
} from "@/lib/security/image-policy.mjs";
import { capturePageThumbnail } from "./page-capture";
import {
  isLegacyThumbnailComputeUrl,
  isUnsafeThumbnailUrl,
  isSupportedThumbnailUrl
} from "./public-thumbnail";

export const MAX_THUMBNAIL_UPLOAD_BYTES = MAX_IMAGE_BYTES;

interface ResolveThumbnailOptions {
  allowPlaceholderReset?: boolean;
  existingThumbnailMode?: ThumbnailMode;
  existingThumbnailUrl?: string | null;
  mode: ThumbnailMode;
  file: File | null;
  sourceUrl: string;
  thumbnailUrl?: string;
}

function toDataUrl(contentType: string, buffer: ArrayBuffer) {
  return `data:${contentType};base64,${Buffer.from(
    buffer
  ).toString("base64")}`;
}

async function validateImageFile(file: File) {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image must be 5 MiB or smaller.");
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  const validated = validateImageBytes(file.type, buffer);

  return { buffer: buffer.buffer, contentType: validated.contentType };
}

async function uploadFileToBlob(
  file: File,
  buffer: ArrayBuffer,
  contentType: string
) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    return toDataUrl(contentType, buffer);
  }

  const blob = await put(
    `thumbnails/${Date.now()}-${file.name}`,
    new Blob([new Uint8Array(buffer)], { type: contentType }),
    {
      access: "public",
      contentType,
      token
    }
  );

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
    isUnsafeThumbnailUrl(thumbnailUrl) ||
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
      const validated = await validateImageFile(file);

      return {
        thumbnailMode: "upload" as const,
        thumbnailUrl: await uploadFileToBlob(
          file,
          validated.buffer,
          validated.contentType
        )
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
