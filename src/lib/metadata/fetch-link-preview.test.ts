import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchSafeHtml } from "@/lib/security/remote-url";
import {
  extractPreviewFromHtml,
  fetchLinkPreview
} from "./fetch-link-preview";

vi.mock("@/lib/security/remote-url", () => ({
  fetchSafeHtml: vi.fn()
}));

describe("extractPreviewFromHtml", () => {
  it("extracts title, description, and og:image", () => {
    const preview = extractPreviewFromHtml(`
      <html>
        <head>
          <title>Talking Vocab Quiz</title>
          <meta property="og:image" content="https://example.com/thumb.png" />
          <meta name="description" content="영어 단어 퀴즈" />
        </head>
      </html>
    `);

    expect(preview.title).toBe("Talking Vocab Quiz");
    expect(preview.description).toBe("영어 단어 퀴즈");
    expect(preview.imageUrl).toBe("https://example.com/thumb.png");
  });

  it("resolves relative image metadata against the source url", () => {
    const preview = extractPreviewFromHtml(
      `
        <html>
          <head>
            <title>PAPS Tracker</title>
            <meta property="og:image" content="/og/paps.png" />
          </head>
        </html>
      `,
      "https://paps-tracker.vercel.app/session/demo"
    );

    expect(preview.imageUrl).toBe("https://paps-tracker.vercel.app/og/paps.png");
  });

  it("falls back to icon links when social image metadata is missing", () => {
    const preview = extractPreviewFromHtml(
      `
        <html>
          <head>
            <title>No Social Image</title>
            <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
          </head>
        </html>
      `,
      "https://example.com/apps/paps"
    );

    expect(preview.imageUrl).toBe("https://example.com/apple-touch-icon.png");
  });

  it("ignores empty data-url icons so auto capture can continue", () => {
    const preview = extractPreviewFromHtml(
      `
        <html>
          <head>
            <title>PDF to PNG 1080p</title>
            <link rel="icon" href="data:," />
          </head>
        </html>
      `,
      "https://wbmaker2.github.io/pdf-to-png/"
    );

    expect(preview.imageUrl).toBeNull();
  });

  it("returns null imageUrl when image metadata is missing", () => {
    const preview = extractPreviewFromHtml(
      "<html><head><title>No Image</title></head></html>"
    );

    expect(preview.imageUrl).toBeNull();
  });
});

describe("fetchLinkPreview", () => {
  const mockedFetchSafeHtml = vi.mocked(fetchSafeHtml);

  beforeEach(() => {
    mockedFetchSafeHtml.mockReset();
  });

  it("uses the bounded HTML fetch and resolves metadata against the final URL", async () => {
    mockedFetchSafeHtml.mockResolvedValue({
      html: `
        <html>
          <head>
            <title>Redirected app</title>
            <meta property="og:image" content="/assets/preview.png" />
          </head>
        </html>
      `,
      finalUrl: "https://final.example/app"
    });

    const preview = await fetchLinkPreview("https://source.example/app");

    expect(mockedFetchSafeHtml).toHaveBeenCalledWith(
      "https://source.example/app",
      expect.objectContaining({
        headers: expect.any(Object)
      })
    );
    expect(preview.imageUrl).toBe("https://final.example/assets/preview.png");
  });
});
