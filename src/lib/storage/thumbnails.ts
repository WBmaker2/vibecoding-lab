import { put } from "@vercel/blob";
import type { ThumbnailMode } from "@/lib/apps/types";
import { fetchLinkPreview } from "@/lib/metadata/fetch-link-preview";
import { buildGeneratedThumbnailUrl } from "./generated-thumbnail";
import { capturePageThumbnail } from "./page-capture";

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

async function uploadFileToBlob(file: File) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    const buffer = await file.arrayBuffer();
    return toDataUrl(file, buffer);
  }

  const blob = await put(`thumbnails/${Date.now()}-${file.name}`, file, {
    access: "public",
    token
  });

  return blob.url;
}

async function resolveAutoThumbnail(sourceUrl: string) {
  const generatedThumbnailUrl = buildGeneratedThumbnailUrl({ sourceUrl });

  try {
    const preview = await fetchLinkPreview(sourceUrl);

    if (preview.imageUrl) {
      return preview.imageUrl;
    }

    const capturedImageUrl = await capturePageThumbnail(sourceUrl);

    return (
      capturedImageUrl ??
      buildGeneratedThumbnailUrl({
        sourceUrl,
        title: preview.title
      }) ??
      generatedThumbnailUrl
    );
  } catch {
    const capturedImageUrl = await capturePageThumbnail(sourceUrl);

    return capturedImageUrl ?? generatedThumbnailUrl;
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
  const preservedThumbnail =
    existingThumbnailUrl && !allowPlaceholderReset
      ? {
          thumbnailMode: existingThumbnailMode ?? ("auto" as const),
          thumbnailUrl: existingThumbnailUrl
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
      return {
        thumbnailMode: "upload" as const,
        thumbnailUrl: await uploadFileToBlob(file)
      };
    }

    return {
      thumbnailMode:
        thumbnailUrl || preservedThumbnail?.thumbnailUrl
          ? existingThumbnailMode ?? ("upload" as const)
          : ("placeholder" as const),
      thumbnailUrl: thumbnailUrl || preservedThumbnail?.thumbnailUrl || null
    };
  }

  const autoUrl = await resolveAutoThumbnail(sourceUrl);

  return {
    thumbnailMode:
      autoUrl || thumbnailUrl ? ("auto" as const) : ("placeholder" as const),
    thumbnailUrl: autoUrl ?? thumbnailUrl ?? null
  };
}
