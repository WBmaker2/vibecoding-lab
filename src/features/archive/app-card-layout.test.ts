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
  });
});
