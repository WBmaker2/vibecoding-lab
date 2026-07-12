import { describe, expect, it, vi } from "vitest";
import { MAX_IMAGE_BYTES } from "../../src/lib/security/image-policy.mjs";
import { fetchSafeImage } from "./safe-image-download.mjs";

const validPng = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
]);

function resource(overrides = {}) {
  return {
    body: validPng,
    finalUrl: "https://images.example.test/thumb.png",
    headers: { "content-type": "image/png" },
    statusCode: 200,
    ...overrides
  };
}

describe("safe exporter image download", () => {
  it("uses the pinned resource transport and validates a fixture without network", async () => {
    const fetchResource = vi.fn().mockResolvedValue(resource());

    await expect(
      fetchSafeImage("https://images.example.test/thumb.png", {
        fetchResource
      })
    ).resolves.toMatchObject({
      body: validPng,
      contentType: "image/png",
      extension: "png"
    });

    expect(fetchResource).toHaveBeenCalledWith(
      "https://images.example.test/thumb.png",
      expect.objectContaining({
        maxBytes: MAX_IMAGE_BYTES,
        maxRedirects: 3,
        method: "GET",
        timeoutMs: 8_000
      })
    );
  });

  it.each([
    ["an oversized body", resource({ body: Buffer.alloc(MAX_IMAGE_BYTES + 1) })],
    ["an invalid MIME", resource({ headers: { "content-type": "image/svg+xml" } })],
    ["an invalid signature", resource({ body: Buffer.from("not an image") })]
  ])("rejects %s before a file can be written", async (_label, response) => {
    await expect(
      fetchSafeImage("https://images.example.test/thumb.png", {
        fetchResource: vi.fn().mockResolvedValue(response)
      })
    ).rejects.toThrow();
  });

  it("preserves timeout and transport failures as a fail-closed rejection", async () => {
    await expect(
      fetchSafeImage("https://images.example.test/slow.png", {
        fetchResource: vi
          .fn()
          .mockRejectedValue(new Error("Remote request timed out."))
      })
    ).rejects.toThrow(/timed out/i);
  });
});
