import { test, expect } from "@playwright/test";
import { openHome, startNewCareer, draftFullXI } from "./helpers.js";

test("reloading mid-career resumes the same career from Home", async ({ page }) => {
  await openHome(page);
  await startNewCareer(page);
  await draftFullXI(page);
  await page.reload();
  await expect(page.getByText("Season 1 · 2026-27")).toBeVisible();
  await page.getByRole("button", { name: "Set your tactic" }).click();
  await expect(page.getByRole("tab", { name: "Board", selected: true })).toBeVisible();
});

test("an exported save imports into a fresh browser from Home", async ({ page, browser, isMobile }) => {
  test.skip(isMobile, "the file download and upload flow runs on the desktop project");
  await openHome(page);
  await startNewCareer(page);
  await draftFullXI(page);

  await page.getByRole("tab", { name: "Club" }).click();
  await page.getByRole("button", { name: "Saves" }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export save" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("era-xi-season1-2026-27.json");
  const savePath = await download.path();

  const freshContext = await browser.newContext();
  const fresh = await freshContext.newPage();
  await openHome(fresh, page.url().replace(/\?.*$/, ""));
  await fresh.getByRole("button", { name: "Saves" }).click();
  await fresh.getByTestId("import-save-input").setInputFiles(savePath);
  await expect(fresh.getByRole("tab", { name: "Board", selected: true })).toBeVisible();
  await expect(fresh.getByRole("button", { name: "Kick off season 1" }).first()).toBeVisible();
  await freshContext.close();
});
