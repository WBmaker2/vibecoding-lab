import { describe, expect, it, vi } from "vitest";
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
    const oversized = Buffer.alloc(MAX_IMAGE_BYTES + 1).toString("base64");
    const bufferFrom = vi.spyOn(Buffer, "from");

    expect(
      decodeDataImageUrl(`data:image/png;base64,${oversized}`)
    ).toBeNull();
    expect(bufferFrom).not.toHaveBeenCalled();
    bufferFrom.mockRestore();
  });

  it("accepts an embedded image at exactly the 5 MiB decoded boundary", () => {
    const boundary = Buffer.alloc(MAX_IMAGE_BYTES);
    boundary.set(validPng);

    expect(
      decodeDataImageUrl(
        `data:image/png;base64,${boundary.toString("base64")}`
      )?.buffer.byteLength
    ).toBe(MAX_IMAGE_BYTES);
  });
});
