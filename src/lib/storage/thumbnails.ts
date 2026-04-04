import { put } from "@vercel/blob";
import type { ThumbnailMode } from "@/lib/apps/types";
import { fetchLinkPreview } from "@/lib/metadata/fetch-link-preview";

interface ResolveThumbnailOptions {
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
  try {
    const preview = await fetchLinkPreview(sourceUrl);
    return preview.imageUrl ?? null;
  } catch {
    return null;
  }
}

export async function resolveThumbnailInput({
  mode,
  file,
  sourceUrl,
  thumbnailUrl
}: ResolveThumbnailOptions) {
  if (mode === "placeholder") {
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
      thumbnailMode: "placeholder" as const,
      thumbnailUrl: thumbnailUrl || null
    };
  }

  const autoUrl = await resolveAutoThumbnail(sourceUrl);

  return {
    thumbnailMode: autoUrl ? ("auto" as const) : ("placeholder" as const),
    thumbnailUrl: autoUrl
  };
}
