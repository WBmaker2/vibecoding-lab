import { describe, expect, it } from "vitest";
import { extractRenderedAppCount, verifyProductionCount } from "./verify-production-gallery.mjs";

describe("production gallery verification", () => {
  it("extracts the visible app count from rendered HTML", () => {
    expect(extractRenderedAppCount('<p><strong>84</strong>개의 앱</p>')).toBe(84);
    expect(extractRenderedAppCount('self.__next_f.push([1,"84개의 앱"])')).toBe(84);
  });

  it("reports a stale production deployment", async () => {
    await expect(
      verifyProductionCount({
        expectedCount: 84,
        attempts: 1,
        fetchHtml: async () => '<strong>46</strong>개의 앱'
      })
    ).rejects.toThrow("expected 84 apps but found 46");
  });
});
