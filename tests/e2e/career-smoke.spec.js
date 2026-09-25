import { test, expect } from "@playwright/test";
import { openHome, startNewCareer, draftFullXI, setStyle, playSeasonToWindow, expectNoHorizontalScroll, expectInViewport, expectAxeClean } from "./helpers.js";

test("draft, set a style, play season 1, pass the window into season 2", async ({ page, isMobile }) => {
  await openHome(page);
  await expectAxeClean(page, "home");
  await startNewCareer(page);
  await expectNoHorizontalScroll(page);

  await draftFullXI(page, {
    onPick: async () => {
      if (!isMobile) return;
      // Phone check (spec 04 §12): the cuttings are in view without scrolling at every pick.
      const cuttings = page.getByRole("button", { name: /Club season/ });
      for (let i = 0; i < await cuttings.count(); i++) await expectInViewport(page, cuttings.nth(i));
    },
  });
  await expectNoHorizontalScroll(page);
  await expectAxeClean(page, "squad after the draft");

  await setStyle(page, "Gegenpress");
  await expect(page.getByRole("region", { name: "Identity and cohesion" })).toContainText("Gegenpress");
  if (isMobile) await expectInViewport(page, page.getByRole("button", { name: "Kick off season 1" }).last());
  await expectAxeClean(page, "board");

  await playSeasonToWindow(page, 1);
  await expectAxeClean(page, "window");
  await page.getByRole("button", { name: "Sign to bench" }).first().click();
  await page.getByRole("button", { name: "Close the window" }).first().click();
  await expect(page.getByText("Season 2 · 2027-28").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Kick off season 2" }).first()).toBeVisible();

  await page.getByRole("tab", { name: "Club" }).click();
  await expect(page.getByRole("row", { name: /2026-27/ })).toBeVisible();
  await expectAxeClean(page, "club");
});

test("the draft is playable with the keyboard alone", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard flow runs on the desktop project");
  await openHome(page);
  await startNewCareer(page);
  await page.keyboard.press("d");
  await expect(page.getByRole("button", { name: /Club season/ }).first()).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: /Club season/ }).first().focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Pick", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Pick", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("1 picked")).toBeVisible();
});
