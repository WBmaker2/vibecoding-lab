import { createRobots } from "./robots";

describe("robots metadata route", () => {
  it("allows public pages, protects private paths, and advertises the sitemap", () => {
    expect(createRobots("https://example.com")).toEqual({
      rules: [
        {
          userAgent: "*",
          allow: "/",
          disallow: ["/admin", "/api"]
        },
        {
          userAgent: "OAI-SearchBot",
          allow: "/",
          disallow: ["/admin", "/api"]
        },
        {
          userAgent: "ChatGPT-User",
          allow: "/",
          disallow: ["/admin", "/api"]
        },
        {
          userAgent: "Claude-SearchBot",
          allow: "/",
          disallow: ["/admin", "/api"]
        },
        {
          userAgent: "Claude-User",
          allow: "/",
          disallow: ["/admin", "/api"]
        },
        {
          userAgent: "PerplexityBot",
          allow: "/",
          disallow: ["/admin", "/api"]
        },
        {
          userAgent: "Perplexity-User",
          allow: "/",
          disallow: ["/admin", "/api"]
        },
        { userAgent: "GPTBot", disallow: "/" },
        { userAgent: "ClaudeBot", disallow: "/" },
        { userAgent: "Google-Extended", disallow: "/" },
        { userAgent: "CCBot", disallow: "/" },
        { userAgent: "Applebot-Extended", disallow: "/" }
      ],
      sitemap: "https://example.com/sitemap.xml",
      host: "https://example.com"
    });
  });
});
