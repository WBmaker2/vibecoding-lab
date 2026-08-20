import { DEFAULT_SITE_URL, getAbsoluteUrl, getSiteUrl } from "./site-url";

describe("site URL helpers", () => {
  it("uses the public custom domain by default", () => {
    expect(DEFAULT_SITE_URL).toBe("https://www.vibehong.shop");
    expect(getSiteUrl().toString()).toBe("https://www.vibehong.shop/");
  });

  it("normalizes host-only values and removes paths, queries, and hashes", () => {
    expect(getSiteUrl("example.com/admin?from=test#top").toString()).toBe(
      "https://example.com/"
    );
  });

  it("builds absolute URLs from public paths", () => {
    expect(getAbsoluteUrl("/apps/sample", "https://example.com")).toBe(
      "https://example.com/apps/sample"
    );
  });
});
