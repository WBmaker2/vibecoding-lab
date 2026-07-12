import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readGlobalStyles() {
  return readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
}

function getCssBlock(css: string, selector: string) {
  const match = css.match(new RegExp(`${selector} \\{([\\s\\S]*?)\\n\\}`));

  return match?.[1] ?? "";
}

describe("archive app card layout styles", () => {
  it("keeps thumbnail media at a stable widescreen ratio instead of a narrow strip", () => {
    const mediaInnerStyles = getCssBlock(
      readGlobalStyles(),
      "\\.app-card-media-inner"
    );

    expect(mediaInnerStyles).toContain("aspect-ratio: 16 / 9");
    expect(mediaInnerStyles).toContain("width: min(100%, 560px)");
    expect(mediaInnerStyles).not.toContain("max-height");
  });

  it("clips thumbnail media so wide filtered cards cannot cover card titles", () => {
    const mediaStyles = getCssBlock(readGlobalStyles(), "\\.app-card-media");

    expect(mediaStyles).toContain("overflow: hidden");
  });

  it("keeps repeated cards compact and defers offscreen rendering", () => {
    const cardStyles = getCssBlock(readGlobalStyles(), "\\.app-card");

    expect(cardStyles).toContain("border-radius: 8px");
    expect(cardStyles).toContain("content-visibility: auto");
    expect(cardStyles).toContain("contain-intrinsic-size: 440px");
  });

  it("keeps the hero unframed and representative tags on one mobile row", () => {
    const styles = readGlobalStyles();
    const heroStyles = getCssBlock(styles, "\\.archive-hero");
    const mobileTagStyles = styles.match(
      /\.archive-hero \.tag-filter-bar \{([\s\S]*?)\n\}/
    )?.[1] ?? "";

    expect(heroStyles).toContain("border: 0");
    expect(heroStyles).toContain("background: transparent");
    expect(heroStyles).toContain("backdrop-filter: none");
    expect(heroStyles).toContain("box-shadow: none");
    expect(mobileTagStyles).toContain("flex-wrap: nowrap");
    expect(mobileTagStyles).toContain("overflow-x: auto");
  });
});
