import { test, expect } from "@playwright/test";
import { draftFullXI, playSeasonToTransfer } from "./helpers.js";

test("draft, simulate season 1, pass the transfer window into season 2", async ({ page }) => {
  await page.goto("./");
  await draftFullXI(page);
  await expect(page.getByRole("button", { name: /Reveal Ratings & Simulate/ })).toBeVisible();

  await playSeasonToTransfer(page, 1);
  await page.getByRole("button", { name: /Continue to Season 2/ }).click();

  await expect(page.getByRole("button", { name: /Reveal Ratings & Simulate/ })).toBeVisible();
  await expect(page.getByText("Season 2 · 2027-28").first()).toBeAttached();
});
