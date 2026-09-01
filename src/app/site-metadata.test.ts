import { createSiteMetadata } from "./site-metadata";

describe("createSiteMetadata", () => {
  it("includes canonical discovery, icons, and social preview metadata", () => {
    const metadata = createSiteMetadata("https://example.com");

    expect(metadata.metadataBase?.toString()).toBe("https://example.com/");
    expect(metadata.title).toMatchObject({
      default:
        "바이브홍 | Hong's Vibe Coding Lab | 교사용 웹앱·수업 도구 아카이브"
    });
    expect(metadata.description).toContain("바이브홍이 만든");
    expect(metadata.description).toContain("교사 업무경감 앱");
    expect(metadata.alternates).toEqual({ canonical: "/" });
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
    expect(metadata.manifest).toBe("/manifest.webmanifest");
    expect(metadata.icons).toMatchObject({
      icon: expect.arrayContaining([
        expect.objectContaining({ url: "/icon" })
      ]),
      apple: expect.arrayContaining([
        expect.objectContaining({ url: "/apple-icon" })
      ])
    });
    expect(metadata.openGraph).toMatchObject({
      title: expect.stringContaining("바이브홍"),
      siteName: "Hong's Vibe Coding Lab",
      url: "/",
      images: expect.arrayContaining([
        expect.objectContaining({ url: "/og-image" })
      ])
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      title: expect.stringContaining("바이브홍"),
      images: expect.arrayContaining(["/og-image"])
    });
  });

  it("adds optional Google and Naver ownership verification metadata", () => {
    const metadata = createSiteMetadata("https://example.com", {
      googleVerification: "google-token",
      naverVerification: "naver-token"
    });

    expect(metadata.verification).toEqual({
      google: "google-token",
      other: {
        "naver-site-verification": "naver-token"
      }
    });
  });
});
