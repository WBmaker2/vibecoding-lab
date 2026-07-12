import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchLinkPreview } from "@/lib/metadata/fetch-link-preview";
import { capturePageThumbnail } from "./page-capture";
import {
  MAX_THUMBNAIL_UPLOAD_BYTES,
  resolveThumbnailInput
} from "./thumbnails";

vi.mock("@/lib/metadata/fetch-link-preview", () => ({
  fetchLinkPreview: vi.fn()
}));

vi.mock(
  "./page-capture",
  () => ({
    capturePageThumbnail: vi.fn()
  })
);

describe("resolveThumbnailInput", () => {
  const mockedFetchLinkPreview = vi.mocked(fetchLinkPreview);
  const mockedCapturePageThumbnail = vi.mocked(capturePageThumbnail);

  function createUploadFile(
    bytes: Uint8Array,
    type: string,
    name: string
  ): File {
    return {
      arrayBuffer: async () =>
        bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength
        ),
      lastModified: 0,
      name,
      size: bytes.byteLength,
      type
    } as File;
  }

  beforeEach(() => {
    mockedFetchLinkPreview.mockReset();
    mockedCapturePageThumbnail.mockReset();
    process.env.APP_BASE_URL = "https://lab.example.com";
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.VERCEL_URL;
  });

  it("keeps the discovered social image when preview metadata exists", async () => {
    mockedFetchLinkPreview.mockResolvedValue({
      title: "PAPS 학생 기록 시스템",
      description: "교사 세션 운영과 학생 기록 입력을 위한 PAPS MVP",
      imageUrl: "https://paps-tracker.vercel.app/og/paps.png"
    });

    const result = await resolveThumbnailInput({
      mode: "auto",
      file: null,
      sourceUrl: "https://paps-tracker.vercel.app"
    });

    expect(result).toEqual({
      thumbnailMode: "auto",
      thumbnailUrl: "https://paps-tracker.vercel.app/og/paps.png"
    });
    expect(mockedCapturePageThumbnail).not.toHaveBeenCalled();
  });

  it("uses a live page capture when the source has no image metadata", async () => {
    mockedFetchLinkPreview.mockResolvedValue({
      title: "PAPS 학생 기록 시스템",
      description: "교사 세션 운영과 학생 기록 입력을 위한 PAPS MVP",
      imageUrl: null
    });
    mockedCapturePageThumbnail.mockResolvedValue(
      "https://lab.example.com/thumbnails/paps-capture.png"
    );

    const result = await resolveThumbnailInput({
      mode: "auto",
      file: null,
      sourceUrl: "https://paps-tracker.vercel.app"
    });

    expect(result).toEqual({
      thumbnailMode: "auto",
      thumbnailUrl: "https://lab.example.com/thumbnails/paps-capture.png"
    });
    expect(mockedCapturePageThumbnail).toHaveBeenCalledWith(
      "https://paps-tracker.vercel.app"
    );
  });

  it("still captures the page when metadata fetching fails", async () => {
    mockedFetchLinkPreview.mockRejectedValue(new Error("network failure"));
    mockedCapturePageThumbnail.mockResolvedValue(
      "https://lab.example.com/thumbnails/paps-capture.png"
    );

    const result = await resolveThumbnailInput({
      mode: "auto",
      file: null,
      sourceUrl: "https://paps-tracker.vercel.app"
    });

    expect(result).toEqual({
      thumbnailMode: "auto",
      thumbnailUrl: "https://lab.example.com/thumbnails/paps-capture.png"
    });
  });

  it("uses a placeholder when metadata and page capture both fail", async () => {
    mockedFetchLinkPreview.mockRejectedValue(new Error("network failure"));
    mockedCapturePageThumbnail.mockResolvedValue(null);

    const result = await resolveThumbnailInput({
      mode: "auto",
      file: null,
      sourceUrl: "https://paps-tracker.vercel.app"
    });

    expect(result).toEqual({
      thumbnailMode: "placeholder",
      thumbnailUrl: null
    });
  });

  it("uses a placeholder when page capture rejects", async () => {
    mockedFetchLinkPreview.mockRejectedValue(new Error("network failure"));
    mockedCapturePageThumbnail.mockRejectedValue(new Error("capture failure"));

    const result = await resolveThumbnailInput({
      mode: "auto",
      file: null,
      sourceUrl: "https://paps-tracker.vercel.app"
    });

    expect(result).toEqual({
      thumbnailMode: "placeholder",
      thumbnailUrl: null
    });
  });

  it.each([
    "/api/thumbnail?host=old.example.com",
    "https://old-project.vercel.app/api/app-thumbnail/app-1/1"
  ])("does not use a stale form compute URL after auto failure: %s", async (staleUrl) => {
    mockedFetchLinkPreview.mockRejectedValue(new Error("network failure"));
    mockedCapturePageThumbnail.mockResolvedValue(null);

    const result = await resolveThumbnailInput({
      mode: "auto",
      file: null,
      sourceUrl: "https://paps-tracker.vercel.app",
      thumbnailUrl: staleUrl
    });

    expect(result).toEqual({
      thumbnailMode: "placeholder",
      thumbnailUrl: null
    });
  });

  it.each([
    "/api/thumbnail?host=old.example.com",
    "https://old-project.vercel.app/api/app-thumbnail/app-1/1"
  ])("does not preserve a stale existing compute URL: %s", async (staleUrl) => {
    mockedFetchLinkPreview.mockRejectedValue(new Error("network failure"));
    mockedCapturePageThumbnail.mockResolvedValue(null);

    const result = await resolveThumbnailInput({
      mode: "placeholder",
      file: null,
      sourceUrl: "https://paps-tracker.vercel.app",
      existingThumbnailMode: "auto",
      existingThumbnailUrl: staleUrl
    });

    expect(result).toEqual({
      thumbnailMode: "placeholder",
      thumbnailUrl: null
    });
  });

  it("preserves a legitimate existing external image URL", async () => {
    const result = await resolveThumbnailInput({
      mode: "placeholder",
      file: null,
      sourceUrl: "https://paps-tracker.vercel.app",
      existingThumbnailMode: "auto",
      existingThumbnailUrl: "https://images.example.com/paps.png"
    });

    expect(result).toEqual({
      thumbnailMode: "auto",
      thumbnailUrl: "https://images.example.com/paps.png"
    });
  });

  it.each([
    "https://cdn.example.com/api/app-thumbnail/logo.png",
    "https://cdn.example.com/api/thumbnail/logo.png"
  ])("preserves a legitimate external image with a route-like path: %s", async (thumbnailUrl) => {
    const result = await resolveThumbnailInput({
      mode: "placeholder",
      file: null,
      sourceUrl: "https://paps-tracker.vercel.app",
      existingThumbnailMode: "auto",
      existingThumbnailUrl: thumbnailUrl
    });

    expect(result).toEqual({
      thumbnailMode: "auto",
      thumbnailUrl
    });
  });

  it("rejects an existing absolute encoded traversal URL in admin resolution", async () => {
    const result = await resolveThumbnailInput({
      mode: "placeholder",
      file: null,
      sourceUrl: "https://paps-tracker.vercel.app",
      existingThumbnailMode: "auto",
      existingThumbnailUrl:
        "https://old-project.vercel.app/api/app-thumbnail/%2e%2e/app-1/1"
    });

    expect(result).toEqual({
      thumbnailMode: "placeholder",
      thumbnailUrl: null
    });
  });

  it("preserves an existing thumbnail when placeholder mode is not confirmed", async () => {
    const result = await resolveThumbnailInput({
      mode: "placeholder",
      file: null,
      sourceUrl: "https://paps-tracker.vercel.app",
      existingThumbnailMode: "auto",
      existingThumbnailUrl: "data:image/png;base64,iVBORw0KGgo="
    });

    expect(result).toEqual({
      thumbnailMode: "auto",
      thumbnailUrl: "data:image/png;base64,iVBORw0KGgo="
    });
  });

  it("does not preserve an invalid existing data-url thumbnail", async () => {
    const result = await resolveThumbnailInput({
      mode: "placeholder",
      file: null,
      sourceUrl: "https://wbmaker2.github.io/pdf-to-png/",
      existingThumbnailMode: "auto",
      existingThumbnailUrl: "data:,"
    });

    expect(result).toEqual({
      thumbnailMode: "placeholder",
      thumbnailUrl: null
    });
  });

  it("clears an existing thumbnail only when placeholder reset is confirmed", async () => {
    const result = await resolveThumbnailInput({
      mode: "placeholder",
      file: null,
      sourceUrl: "https://paps-tracker.vercel.app",
      existingThumbnailMode: "auto",
      existingThumbnailUrl: "data:image/png;base64,iVBORw0KGgo=",
      allowPlaceholderReset: true
    });

    expect(result).toEqual({
      thumbnailMode: "placeholder",
      thumbnailUrl: null
    });
  });

  it("rejects uploads larger than the server-side limit", async () => {
    const file = createUploadFile(
      new Uint8Array(MAX_THUMBNAIL_UPLOAD_BYTES + 1),
      "image/png",
      "large.png"
    );

    await expect(
      resolveThumbnailInput({
        mode: "upload",
        file,
        sourceUrl: "https://example.com"
      })
    ).rejects.toThrow(/5 MiB|size/i);
  });

  it("rejects SVG uploads", async () => {
    const file = createUploadFile(
      new TextEncoder().encode("<svg></svg>"),
      "image/svg+xml",
      "icon.svg"
    );

    await expect(
      resolveThumbnailInput({
        mode: "upload",
        file,
        sourceUrl: "https://example.com"
      })
    ).rejects.toThrow(/image/i);
  });

  it("rejects a PNG MIME type with invalid signature bytes", async () => {
    const file = createUploadFile(
      new TextEncoder().encode("not a png"),
      "image/png",
      "spoofed.png"
    );

    await expect(
      resolveThumbnailInput({
        mode: "upload",
        file,
        sourceUrl: "https://example.com"
      })
    ).rejects.toThrow(/signature|image/i);
  });

  it("accepts a valid small PNG upload", async () => {
    const file = createUploadFile(
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      "image/png",
      "tiny.png"
    );

    await expect(
      resolveThumbnailInput({
        mode: "upload",
        file,
        sourceUrl: "https://example.com"
      })
    ).resolves.toMatchObject({
      thumbnailMode: "upload",
      thumbnailUrl: expect.stringMatching(/^data:image\/png;base64,/)
    });
  });

  it("accepts a valid AVIF upload with an ftyp avif signature", async () => {
    const file = createUploadFile(
      new Uint8Array([
        0x00, 0x00, 0x00, 0x10,
        0x66, 0x74, 0x79, 0x70,
        0x61, 0x76, 0x69, 0x66,
        0x00, 0x00, 0x00, 0x00
      ]),
      "image/avif",
      "tiny.avif"
    );

    await expect(
      resolveThumbnailInput({
        mode: "upload",
        file,
        sourceUrl: "https://example.com"
      })
    ).resolves.toMatchObject({
      thumbnailMode: "upload",
      thumbnailUrl: expect.stringMatching(/^data:image\/avif;base64,/)
    });
  });

  it("rejects an AVIF MIME type without an ftyp signature", async () => {
    const file = createUploadFile(
      new TextEncoder().encode("not an avif"),
      "image/avif",
      "spoofed.avif"
    );

    await expect(
      resolveThumbnailInput({
        mode: "upload",
        file,
        sourceUrl: "https://example.com"
      })
    ).rejects.toThrow(/signature|image/i);
  });
});
