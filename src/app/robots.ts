import type { MetadataRoute } from "next";
import { getAbsoluteUrl, getSiteUrl } from "@/lib/seo/site-url";

export function createRobots(siteUrl?: string): MetadataRoute.Robots {
  const origin = getSiteUrl(siteUrl).origin;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api"]
      }
    ],
    sitemap: getAbsoluteUrl("/sitemap.xml", siteUrl),
    host: origin
  };
}

export default function robots(): MetadataRoute.Robots {
  return createRobots();
}
