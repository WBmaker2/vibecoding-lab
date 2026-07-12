export const MAX_IMAGE_BYTES: number;
export const SUPPORTED_IMAGE_MIME_TYPES: readonly string[];

export function normalizeImageMime(contentType: unknown): string | null;

export function validateImageBytes(
  contentType: unknown,
  bytes: ArrayBuffer | Uint8Array
): { contentType: string; extension: string };

export function decodeDataImageUrl(value: unknown): {
  buffer: Buffer;
  contentType: string;
  extension: string;
} | null;
