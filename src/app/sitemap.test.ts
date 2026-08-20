import type { PublicAppRecord } from "@/lib/apps/types";
import { createAppPath } from "@/lib/apps/app-slug";
import { createSitemap } from "./sitemap";

const app: PublicAppRecord = {
  id: "b5c444ba-0d76-4bc5-b787-3132985da0d3",
  title: "PDF to PNG 1080p",
  summary: "PDF 변환 도구",
  url: "https://example.com/tool",
  tags: ["PDF", "업무"],
  thumbnailMode: "upload",
  thumbnailUrl: "/app-thumbnails/sample.png",
  createdAt: new Date("2026-05-03T09:33:29.709Z"),
  updatedAt: new Date("2026-07-23T09:14:28.416Z")
};

describe("sitemap metadata route", () => {
  it("contains the home page and each static app detail page", () => {
    const sitemap = createSitemap([app], "https://example.com");

    expect(sitemap).toHaveLength(2);
    expect(sitemap[0]).toMatchObject({
      url: "https://example.com/",
      changeFrequency: "weekly",
      priority: 1
    });
    expect(sitemap[1]).toMatchObject({
      url: `https://example.com${createAppPath(app)}`,
      lastModified: app.updatedAt,
      changeFrequency: "monthly",
      priority: 0.8
    });
  });
});
