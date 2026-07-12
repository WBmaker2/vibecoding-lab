import { expect, test } from "@playwright/test";

test("public archive supports compact browsing on desktop and mobile", async ({
  page
}) => {
  const forbiddenRequests: string[] = [];
  page.on("request", (request) => {
    const url = request.url();

    if (
      url.includes("/_next/image") ||
      url.includes("/api/thumbnail") ||
      url.includes("/api/app-thumbnail")
    ) {
      forbiddenRequests.push(url);
    }
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Hong's Vibe Coding Lab" })
  ).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "앱 검색" })).toBeVisible();
  await expect(page.getByRole("toolbar", { name: "태그 필터" })).toBeVisible();
  await expect(page.getByRole("button", { name: "모든 태그 보기" })).toBeVisible();
  await expect(page.getByRole("button", { name: "업데이트 내역" })).toBeVisible();

  const representativeTagMetrics = await page
    .getByRole("button", { name: "#수업" })
    .evaluate((tag) => {
      const styles = window.getComputedStyle(tag);
      const bounds = tag.getBoundingClientRect();

      return {
        flexShrink: styles.flexShrink,
        height: bounds.height,
        whiteSpace: styles.whiteSpace,
        width: bounds.width
      };
    });

  expect(representativeTagMetrics.flexShrink).toBe("0");
  expect(representativeTagMetrics.whiteSpace).toBe("nowrap");
  expect(representativeTagMetrics.width).toBeGreaterThan(48);
  expect(representativeTagMetrics.height).toBeLessThan(48);

  const firstCard = page.locator(".app-card").first();
  await expect(firstCard).toBeVisible();
  const firstCardBox = await firstCard.boundingBox();
  expect(firstCardBox).not.toBeNull();
  expect(firstCardBox?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(844);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth)
  ).toBe(await page.evaluate(() => window.innerWidth));
  await expect(page.locator(".app-card-thumbnail")).toHaveCount(56);
  await expect
    .poll(
      () =>
        firstCard
          .locator(".app-card-thumbnail")
          .evaluate((image) => (image as HTMLImageElement).naturalWidth),
      { message: "the visible app thumbnail should load as an image" }
    )
    .toBeGreaterThan(0);
  await expect(
    page.getByRole("link", { name: /앱 새 창에서 열기/ }).first()
  ).toBeVisible();

  await page.getByRole("button", { name: "#과학" }).click();
  await expect(page.getByLabel("활성 필터").getByText("#과학")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "AI 원어민 단어 퀴즈 쇼" })
  ).toHaveCount(0);
  await page.getByRole("button", { name: "필터 초기화" }).click();
  await expect(
    page.getByRole("heading", { name: "AI 원어민 단어 퀴즈 쇼" })
  ).toBeVisible();

  await page.getByRole("searchbox", { name: "앱 검색" }).fill("원어민");
  await expect(
    page.getByLabel("활성 필터").getByText('검색어 "원어민"')
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "AI 원어민 단어 퀴즈 쇼" })
  ).toBeVisible();

  await page.getByRole("searchbox", { name: "앱 검색" }).fill("없는앱");
  await expect(
    page.getByText("조건을 조금 바꾸면 더 잘 찾을 수 있습니다")
  ).toBeVisible();
  await page.getByRole("button", { name: "필터 초기화" }).click();

  await page.getByRole("button", { name: "모든 태그 보기" }).click();
  await expect(page.getByRole("button", { name: "#영어" })).toBeVisible();
  await expect(page.getByRole("button", { name: "모든 태그 접기" })).toBeVisible();
  await page.getByRole("button", { name: "#영어" }).click();
  await expect(page.getByLabel("활성 필터").getByText("#영어")).toBeVisible();
  await page.getByRole("button", { name: "필터 초기화" }).click();

  const updateTrigger = page.getByRole("button", { name: "업데이트 내역" });
  await updateTrigger.click();
  await expect(
    page.getByRole("dialog", { name: "Hong's Vibe Coding Lab 업데이트 내역" })
  ).toBeVisible();
  await page.getByRole("button", { name: "닫기" }).click();
  await expect(updateTrigger).toBeFocused();

  await updateTrigger.click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(updateTrigger).toBeFocused();

  expect(forbiddenRequests).toEqual([]);
});
