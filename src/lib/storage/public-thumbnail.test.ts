import {
  buildPublicThumbnailUrl,
  decodeEmbeddedThumbnailUrl,
  isEmbeddedThumbnailUrl,
  toPublicThumbnailUrl
} from "./public-thumbnail";

describe("public thumbnail helpers", () => {
  const updatedAt = new Date("2026-05-01T03:00:00.000Z");

  it("keeps external thumbnail URLs unchanged for the public payload", () => {
    expect(
      toPublicThumbnailUrl({
        id: "app-1",
        thumbnailUrl: "https://example.com/thumb.png",
        updatedAt
      })
    ).toBe("https://example.com/thumb.png");
  });

  it("replaces embedded thumbnails with a lightweight app route", () => {
    expect(
      toPublicThumbnailUrl({
        id: "app-1",
        thumbnailUrl: "data:image/png;base64,aGVsbG8=",
        updatedAt
      })
    ).toBe(buildPublicThumbnailUrl("app-1", updatedAt));
  });

  it("hides unsupported data URLs instead of rendering broken image icons", () => {
    expect(
      toPublicThumbnailUrl({
        id: "app-1",
        thumbnailUrl: "data:,",
        updatedAt
      })
    ).toBeNull();
  });

  it("detects and decodes embedded image payloads", () => {
    const decoded = decodeEmbeddedThumbnailUrl(
      "data:image/png;base64,aGVsbG8="
    );

    expect(isEmbeddedThumbnailUrl("data:image/png;base64,aGVsbG8=")).toBe(true);
    expect(decoded?.contentType).toBe("image/png");
    expect(decoded?.buffer.toString("utf8")).toBe("hello");
  });
});
