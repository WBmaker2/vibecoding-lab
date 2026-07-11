import { expect, test } from "@playwright/test";

test("public archive supports search and tag filtering", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Hong's Vibe Coding Lab" })
  ).toBeVisible();
  await expect(page.getByText(/공개 아카이브/i)).toBeVisible();
  await expect(page.getByText(/^대표 태그$/)).toBeVisible();

  await page.getByRole("button", { name: "대표 태그 펼치기" }).click();
  await page.getByRole("button", { name: "#영어" }).click();
  await expect(page.getByLabel("활성 필터").getByText("#영어")).toBeVisible();
  await expect(page.getByRole("button", { name: "필터 초기화" })).toBeVisible();
  await expect(page.getByText("AI 원어민 단어 퀴즈 쇼")).toBeVisible();
  await expect(page.getByText("Class Random Seat")).toHaveCount(0);

  await page.getByRole("button", { name: "필터 초기화" }).click();
  await page.getByRole("searchbox", { name: "앱 검색" }).fill("원어민");
  await expect(
    page.getByLabel("활성 필터").getByText('검색어 "원어민"')
  ).toBeVisible();
  await expect(page.getByText("AI 원어민 단어 퀴즈 쇼")).toBeVisible();

  await page.getByRole("searchbox", { name: "앱 검색" }).fill("없는앱");
  await expect(
    page.getByText("조건을 조금 바꾸면 더 잘 찾을 수 있습니다")
  ).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("searchbox", { name: "앱 검색" })).toBeVisible();
  await expect(page.getByRole("link", { name: "앱 열기" }).first()).toBeVisible();
});
