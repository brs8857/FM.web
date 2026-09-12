import { test, expect } from "@playwright/test";
import { draftFullXI } from "./helpers.js";

test("reloading mid-tactics offers to continue the same career", async ({ page }) => {
  await page.goto("./");
  await draftFullXI(page);
  await expect(page.getByRole("button", { name: /Reveal Ratings & Simulate/ })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Season 1 · 2026-27 · Tactics")).toBeVisible();
  await page.getByRole("button", { name: "Continue career" }).click();
  await expect(page.getByRole("button", { name: /Reveal Ratings & Simulate/ })).toBeVisible();
});

test("an exported save imports into a fresh browser", async ({ page, browser, isMobile }) => {
  test.skip(isMobile, "the file download and upload flow runs on the desktop project");
  await page.goto("./");
  await draftFullXI(page);

  await page.getByRole("button", { name: "Menu" }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("menuitem", { name: "Export save" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("fmweb-season1-2026-27.json");
  const savePath = await download.path();

  const freshContext = await browser.newContext();
  const fresh = await freshContext.newPage();
  await fresh.goto(page.url());
  await fresh.getByRole("button", { name: "Menu" }).click();
  await fresh.getByTestId("import-save-input").setInputFiles(savePath);
  await expect(fresh.getByRole("button", { name: /Reveal Ratings & Simulate/ })).toBeVisible();
  await freshContext.close();
});
