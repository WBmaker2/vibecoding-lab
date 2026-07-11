import {
  decodeEmbeddedThumbnailUrl,
  isEmbeddedThumbnailUrl,
  isLegacyThumbnailComputeUrl,
  isUnsafeThumbnailUrl,
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

  it.each([
    "/api/thumbnail?host=old.example.com",
    "/api/app-thumbnail/app-1/1",
    "https://old-project.vercel.app/api/thumbnail?host=old.example.com",
    "https://old-project.vercel.app/api/app-thumbnail/app-1/1",
    "https://old-project.vercel.app/api/%61pp-thumbnail/app-1/1"
  ])("detects legacy compute URLs regardless of origin: %s", (value) => {
    expect(isLegacyThumbnailComputeUrl(value)).toBe(true);
  });

  it("does not classify legitimate external or embedded images as legacy compute URLs", () => {
    expect(
      isLegacyThumbnailComputeUrl("https://example.com/images/thumb.png")
    ).toBe(false);
    expect(
      isLegacyThumbnailComputeUrl("data:image/png;base64,aGVsbG8=")
    ).toBe(false);
  });

  it.each([
    "https://old-project.vercel.app/api/app-thumbnail/%2e%2e/app-1/1",
    "/images/../api/thumbnail"
  ])("classifies traversal separately from legacy compute URLs: %s", (value) => {
    expect(isUnsafeThumbnailUrl(value)).toBe(true);
    expect(isLegacyThumbnailComputeUrl(value)).toBe(false);
    expect(toPublicThumbnailUrl({ thumbnailUrl: value })).toBeNull();
  });

  it.each([
    "/api/thumbnail?host=old.example.com",
    "https://old-project.vercel.app/api/app-thumbnail/app-1/1"
  ])("hides legacy compute URLs from public conversion: %s", (thumbnailUrl) => {
    expect(toPublicThumbnailUrl({ thumbnailUrl })).toBeNull();
  });

  it.each([
    "https://cdn.example.com/api/app-thumbnail/logo.png",
    "https://cdn.example.com/api/thumbnail/logo.png"
  ])("preserves external images with non-route thumbnail paths: %s", (thumbnailUrl) => {
    expect(isLegacyThumbnailComputeUrl(thumbnailUrl)).toBe(false);
    expect(toPublicThumbnailUrl({ thumbnailUrl })).toBe(thumbnailUrl);
  });
});
