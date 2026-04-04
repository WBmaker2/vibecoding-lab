import { expect, test } from "@playwright/test";

test("public archive supports search and tag filtering", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Hong's Vibe Coding Lab" })
  ).toBeVisible();

  await page.getByRole("searchbox", { name: "앱 검색" }).fill("형성평가");
  await expect(page.getByText("Talking Vocab Quiz")).toBeVisible();
  await expect(page.getByText("Class Random Seat")).toHaveCount(0);

  await page.getByRole("button", { name: "#영어" }).click();
  await expect(page.getByText("Talking Vocab Quiz")).toBeVisible();

  await page.getByRole("button", { name: "태그 초기화" }).click();
  await page.getByRole("searchbox", { name: "앱 검색" }).fill("없는앱");
  await expect(page.getByText("조건에 맞는 앱을 찾지 못했습니다")).toBeVisible();
});
