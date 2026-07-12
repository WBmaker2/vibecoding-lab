import { createSiteMetadata } from "./site-metadata";

describe("createSiteMetadata", () => {
  it("includes manifest, icons, and social preview metadata", () => {
    const metadata = createSiteMetadata("https://example.com");

    expect(metadata.metadataBase?.toString()).toBe("https://example.com/");
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
      siteName: "Hong's Vibe Coding Lab",
      images: expect.arrayContaining([
        expect.objectContaining({ url: "/og-image" })
      ])
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      images: expect.arrayContaining(["/og-image"])
    });
  });
});
