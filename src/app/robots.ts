import type { MetadataRoute } from "next";
import { getAbsoluteUrl, getSiteUrl } from "@/lib/seo/site-url";

const PRIVATE_PATHS = ["/admin", "/api"];

// Search/fetch bots are allowed to discover public pages. Training crawlers
// stay opt-out by default until the site owner explicitly chooses otherwise.
const SEARCH_CRAWLERS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User"
] as const;

const TRAINING_CRAWLERS = [
  "GPTBot",
  "ClaudeBot",
  "Google-Extended",
  "CCBot",
  "Applebot-Extended"
] as const;

export function createRobots(siteUrl?: string): MetadataRoute.Robots {
  const origin = getSiteUrl(siteUrl).origin;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE_PATHS
      },
      ...SEARCH_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: PRIVATE_PATHS
      })),
      ...TRAINING_CRAWLERS.map((userAgent) => ({
        userAgent,
        disallow: "/"
      }))
    ],
    sitemap: getAbsoluteUrl("/sitemap.xml", siteUrl),
    host: origin
  };
}

export default function robots(): MetadataRoute.Robots {
  return createRobots();
}
