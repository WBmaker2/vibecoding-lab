import { createRobots } from "./robots";

describe("robots metadata route", () => {
  it("allows public pages, protects private paths, and advertises the sitemap", () => {
    expect(createRobots("https://example.com")).toEqual({
      rules: [
        {
          userAgent: "*",
          allow: "/",
          disallow: ["/admin", "/api"]
        }
      ],
      sitemap: "https://example.com/sitemap.xml",
      host: "https://example.com"
    });
  });
});
