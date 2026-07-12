import { describe, expect, it } from "vitest";
import {
  decodeDataImageUrl,
  MAX_IMAGE_BYTES,
  validateImageBytes
} from "./image-policy.mjs";

const validPng = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
]);

function dataUrl(contentType: string, bytes: Uint8Array) {
  return `data:${contentType};base64,${Buffer.from(bytes).toString("base64")}`;
}

describe("shared image policy", () => {
  it("accepts a valid PNG through the data URL path", () => {
    expect(decodeDataImageUrl(dataUrl("image/png", validPng))).toMatchObject({
      contentType: "image/png",
      extension: "png"
    });
  });

  it.each([
    ["image/svg+xml", validPng],
    ["image/bmp", validPng],
    ["image/png", new TextEncoder().encode("not an image")]
  ])("rejects MIME/signature mismatch for %s", (contentType, bytes) => {
    expect(() => validateImageBytes(contentType, bytes)).toThrow();
    expect(decodeDataImageUrl(dataUrl(contentType, bytes))).toBeNull();
  });

  it("rejects an embedded image over 5 MiB before materialization", () => {
    const oversized = new Uint8Array(MAX_IMAGE_BYTES + 1);
    oversized.set(validPng);

    expect(() => validateImageBytes("image/png", oversized)).toThrow(/5 MiB/i);
    expect(decodeDataImageUrl(dataUrl("image/png", oversized))).toBeNull();
  });
});
