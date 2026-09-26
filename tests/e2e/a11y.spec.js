import { test, expect } from "@playwright/test";
import { openHome, startNewCareer, draftFullXI, setStyle, expectAxeClean, expectNoHorizontalScroll } from "./helpers.js";

// axe on every screen, in every project (spec 04 §8.11), plus the width and
// reduced-motion checks. Visual snapshots are opt-in with VISUAL=1 because
// they need a first capture on a real browser: `VISUAL=1 npx playwright test
// --update-snapshots` writes tests/e2e/__snapshots__.
const visual = process.env.VISUAL === "1";

async function snap(page, name) {
  if (!visual) return;
  await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true, animations: "disabled" });
}

test("every screen passes axe and never scrolls sideways", async ({ page }) => {
  await openHome(page);
  await expectAxeClean(page, "home");
  await snap(page, "home");
  await page.getByRole("button", { name: "New career" }).click();
  await expectAxeClean(page, "era");
  await snap(page, "era");
  await page.getByRole("button", { name: "Choose a shape" }).click();
  await expectAxeClean(page, "shape");
  await snap(page, "shape");
  await page.getByRole("button", { name: "Choose your colours" }).click();
  await expectAxeClean(page, "colours");
  await page.getByRole("radio", { name: "Aston Villa" }).click();
  await expectAxeClean(page, "colours, club chosen");
  await snap(page, "colours");
  await page.getByRole("button", { name: "Start the draft" }).click();
  await page.getByRole("button", { name: "Draw", exact: true }).click();
  await expect(page.getByRole("button", { name: /Club season/ }).first()).toBeVisible({ timeout: 10_000 });
  await expectAxeClean(page, "draft");
  await expectNoHorizontalScroll(page);
  await snap(page, "draft");
  await page.getByRole("button", { name: /Club season/ }).first().click();
  await expectAxeClean(page, "cutting sheet");
  await page.getByRole("button", { name: "Close" }).click();
  await draftFullXI(page);

  for (const tab of ["Squad", "Board", "Season", "Club"]) {
    await page.getByRole("tab", { name: tab }).click();
    await expectAxeClean(page, tab);
    await expectNoHorizontalScroll(page);
    await snap(page, tab.toLowerCase());
  }
  await setStyle(page);
  await page.getByRole("button", { name: "Kick off season 1" }).first().click();
  await expectAxeClean(page, "reveal");
  await page.getByRole("button", { name: "Start season 1" }).click({ timeout: 15_000 });
  await expectAxeClean(page, "match day");
  await expectNoHorizontalScroll(page);
  await snap(page, "match-day");
  await page.getByRole("button", { name: /^Play week 1: / }).first().click();
  await page.getByRole("button", { name: /Season so far/ }).click();
  await page.getByRole("list", { name: "Results" }).getByRole("button").first().click();
  await expectAxeClean(page, "match day, report row open");
  await expectNoHorizontalScroll(page);
  await page.getByRole("button", { name: "Play to…" }).click();
  await expectAxeClean(page, "play to sheet");
  await page.getByRole("radio", { name: /The end of the season/ }).click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expectAxeClean(page, "vidiprinter");
  await page.getByRole("button", { name: "Skip to end" }).click();
  await expect(page.getByRole("button", { name: "Share" })).toBeVisible();
  await expectAxeClean(page, "back page");
  await snap(page, "back-page");
  await page.getByRole("button", { name: "Open the window" }).first().click();
  await expectAxeClean(page, "window");
  await expectNoHorizontalScroll(page);
  await snap(page, "window");
});

test("reduced motion shows the reveal and the season instantly", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openHome(page);
  await startNewCareer(page);
  await draftFullXI(page);
  await setStyle(page);
  await page.getByRole("button", { name: "Kick off season 1" }).first().click();
  await expect(page.getByText("Squad average")).toBeVisible({ timeout: 2000 });
  await page.getByRole("button", { name: "Start season 1" }).click();
  await page.getByRole("button", { name: "Play to…" }).click();
  await page.getByRole("radio", { name: /The end of the season/ }).click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByRole("button", { name: "Share" })).toBeVisible({ timeout: 2000 });
  await expect(page.getByRole("button", { name: "Skip to end" })).toHaveCount(0);
});

test("the dark theme and 200% zoom keep every control reachable", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await openHome(page);
  await expectAxeClean(page, "home, dark");
  await snap(page, "home-dark");
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  await page.getByRole("button", { name: "New career" }).click();
  await expectNoHorizontalScroll(page);
  await page.getByRole("button", { name: "Choose a shape" }).click();
  await expectNoHorizontalScroll(page);
  await page.getByRole("button", { name: "Choose your colours" }).click();
  await expectNoHorizontalScroll(page);
  await page.getByRole("button", { name: "Start the draft" }).click();
  await page.getByRole("button", { name: "Draw", exact: true }).click();
  await expect(page.getByRole("button", { name: /Club season/ }).first()).toBeVisible({ timeout: 10_000 });
  await expectNoHorizontalScroll(page);
});

test.skip(!visual, "visual snapshots at 375 and 1280 in both themes (VISUAL=1)");
