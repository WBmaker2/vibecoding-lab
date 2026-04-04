import { describe, expect, it } from "vitest";
import { extractPreviewFromHtml } from "./fetch-link-preview";

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

  it("returns null imageUrl when image metadata is missing", () => {
    const preview = extractPreviewFromHtml(
      "<html><head><title>No Image</title></head></html>"
    );

    expect(preview.imageUrl).toBeNull();
  });
});
