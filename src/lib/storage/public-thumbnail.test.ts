import {
  decodeEmbeddedThumbnailUrl,
  isEmbeddedThumbnailUrl,
  toPublicThumbnailUrl
} from "./public-thumbnail";

describe("public thumbnail helpers", () => {
  it("keeps external thumbnail URLs unchanged for the public payload", () => {
    expect(
      toPublicThumbnailUrl({
        thumbnailUrl: "https://example.com/thumb.png"
      })
    ).toBe("https://example.com/thumb.png");
  });

  it("does not expose embedded thumbnails through a runtime route", () => {
    expect(
      toPublicThumbnailUrl({
        thumbnailUrl: "data:image/png;base64,aGVsbG8="
      })
    ).toBeNull();
  });

  it("hides unsupported data URLs instead of rendering broken image icons", () => {
    expect(
      toPublicThumbnailUrl({
        thumbnailUrl: "data:,"
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
