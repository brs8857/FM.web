import { expect } from "@playwright/test";

export async function draftFullXI(page) {
  await page.getByRole("button", { name: /Start the draft/ }).click();
  for (let pick = 0; pick < 11; pick++) {
    await page.getByRole("button", { name: /Spin the wheel/ }).click();
    const firstCard = page.getByRole("button", { name: /Age / }).first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });
    await firstCard.click();
  }
  await page.getByRole("button", { name: /Go to Tactics/ }).click();
}

export async function playSeasonToTransfer(page, season = 1) {
  await page.getByRole("button", { name: /Reveal Ratings & Simulate/ }).click();
  await page.getByRole("button", { name: new RegExp(`Kick Off Season ${season}`) }).click({ timeout: 15_000 });
  await page.getByRole("button", { name: new RegExp(`Continue to Season ${season + 1}`) }).click({ timeout: 20_000 });
  await expect(page.getByText("Transfer Window", { exact: true })).toBeVisible();
}
