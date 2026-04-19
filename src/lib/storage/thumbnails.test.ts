import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchLinkPreview } from "@/lib/metadata/fetch-link-preview";
import { capturePageThumbnail } from "./page-capture";
import { resolveThumbnailInput } from "./thumbnails";

vi.mock("@/lib/metadata/fetch-link-preview", () => ({
  fetchLinkPreview: vi.fn()
}));

vi.mock(
  "./page-capture",
  () => ({
    capturePageThumbnail: vi.fn()
  }),
  { virtual: true }
);

describe("resolveThumbnailInput", () => {
  const mockedFetchLinkPreview = vi.mocked(fetchLinkPreview);
  const mockedCapturePageThumbnail = vi.mocked(capturePageThumbnail);

  beforeEach(() => {
    mockedFetchLinkPreview.mockReset();
    mockedCapturePageThumbnail.mockReset();
    process.env.APP_BASE_URL = "https://lab.example.com";
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

  it("falls back to an internal generated thumbnail when page capture also fails", async () => {
    mockedFetchLinkPreview.mockRejectedValue(new Error("network failure"));
    mockedCapturePageThumbnail.mockResolvedValue(null);

    const result = await resolveThumbnailInput({
      mode: "auto",
      file: null,
      sourceUrl: "https://paps-tracker.vercel.app"
    });

    expect(result.thumbnailMode).toBe("auto");
    expect(result.thumbnailUrl).toBe(
      "https://lab.example.com/api/thumbnail?host=paps-tracker.vercel.app"
    );
  });

  it("preserves an existing thumbnail when placeholder mode is not confirmed", async () => {
    const result = await resolveThumbnailInput({
      mode: "placeholder",
      file: null,
      sourceUrl: "https://paps-tracker.vercel.app",
      existingThumbnailMode: "auto",
      existingThumbnailUrl: "data:image/png;base64,existing"
    });

    expect(result).toEqual({
      thumbnailMode: "auto",
      thumbnailUrl: "data:image/png;base64,existing"
    });
  });

  it("clears an existing thumbnail only when placeholder reset is confirmed", async () => {
    const result = await resolveThumbnailInput({
      mode: "placeholder",
      file: null,
      sourceUrl: "https://paps-tracker.vercel.app",
      existingThumbnailMode: "auto",
      existingThumbnailUrl: "data:image/png;base64,existing",
      allowPlaceholderReset: true
    });

    expect(result).toEqual({
      thumbnailMode: "placeholder",
      thumbnailUrl: null
    });
  });
});
