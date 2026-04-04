import { expect, test } from "@playwright/test";

test("admin can log in and create an app", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("관리자 비밀번호").fill("very-secret-password");
  await page.getByRole("button", { name: "로그인" }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "앱 등록 관리" })).toBeVisible();

  await page.getByLabel("제목").first().fill("Reading Timer");
  await page.getByLabel("한 줄 설명").first().fill("읽기 활동 시간을 관리하는 타이머");
  await page.getByLabel("앱 링크").first().fill("https://example.com/reading-timer");
  await page
    .locator('input[placeholder="엔터 또는 쉼표로 태그 추가"]')
    .first()
    .fill("읽기");
  await page
    .locator('input[placeholder="엔터 또는 쉼표로 태그 추가"]')
    .first()
    .press("Enter");
  await page
    .locator('input[placeholder="엔터 또는 쉼표로 태그 추가"]')
    .first()
    .fill("국어");
  await page
    .locator('input[placeholder="엔터 또는 쉼표로 태그 추가"]')
    .first()
    .press("Enter");
  await page.getByRole("button", { name: "앱 등록" }).click();

  await expect(page.getByText("Reading Timer")).toBeVisible();

  await page.goto("/");
  await page.getByRole("searchbox", { name: "앱 검색" }).fill("Reading Timer");
  await expect(page.getByText("Reading Timer")).toBeVisible();
});
