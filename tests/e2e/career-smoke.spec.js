import { test, expect } from "@playwright/test";
import { openHome, startNewCareer, draftFullXI, setStyle, playSeasonToWindow, coverBans, finishSeason, expectNoHorizontalScroll, expectInViewport, expectAxeClean } from "./helpers.js";

test("draft, set a style, play season 1, pass the window into season 2", async ({ page, isMobile }) => {
  await openHome(page);
  await expectAxeClean(page, "home");
  await startNewCareer(page);
  await expectNoHorizontalScroll(page);

  await draftFullXI(page, {
    onPick: async () => {
      if (!isMobile) return;
      // Phone check (spec 04 §12): the cuttings are in view without scrolling at every pick.
      const cuttings = page.getByRole("list", { name: "Cuttings" }).getByRole("button");
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

  // Season two by hand: three single matches, a style change before the third.
  await page.getByRole("button", { name: "Kick off season 2" }).last().click();
  await page.getByRole("button", { name: "Start season 2" }).last().click({ timeout: 15_000 });
  await expectAxeClean(page, "match day");
  for (const week of [1, 2]) {
    await coverBans(page);
    await page.getByRole("button", { name: new RegExp(`^Play week ${week}: `) }).first().click();
    await expect(page.getByRole("heading", { name: "Last match" })).toBeVisible();
  }
  await coverBans(page);
  await setStyle(page, "Park The Bus");
  await expect(page.getByText(/^Just changed: cohesion −\d this match/).first()).toBeVisible();
  await page.getByRole("button", { name: /^Play week 3: / }).last().click();
  await expect(page.getByRole("tab", { name: "Season", selected: true })).toBeVisible();
  await expect(page.getByText("Changed this week")).toBeVisible();
  await expectAxeClean(page, "match day with a report");
  await finishSeason(page);
  await expect(page.getByText(/^Top scorer: /)).toBeVisible();

  await page.getByRole("tab", { name: "Club" }).click();
  await expect(page.getByRole("row", { name: /2026-27/ })).toBeVisible();
  await expectAxeClean(page, "club");
});

// Spec 07 §12: a season played with Play to… the end, watching the feed,
// takes no longer than the 2.5 vidiprinter did (38 lines at 350 ms and the
// half-season stop), and a single match renders its report promptly.
test("pacing: Play to the end is no slower than the old vidiprinter", async ({ page, isMobile }) => {
  test.skip(isMobile, "measured on the desktop project");
  await openHome(page);
  await startNewCareer(page);
  await draftFullXI(page);
  await setStyle(page, "Gegenpress");
  await page.getByRole("button", { name: "Kick off season 1" }).last().click();
  await page.getByRole("button", { name: "Start season 1" }).last().click({ timeout: 15_000 });
  const single = Date.now();
  await page.getByRole("button", { name: /^Play week 1: / }).first().click();
  await expect(page.getByRole("heading", { name: "Last match" })).toBeVisible();
  expect(Date.now() - single, "one Play step").toBeLessThan(1000);

  // Bans stop a run for a swap; the time spent swapping is not the feed's.
  const oldVidiprinterMs = 38 * 350;
  let fed = 0;
  for (let run = 0; run < 40 && !(await page.getByRole("button", { name: "Share" }).isVisible().catch(() => false)); run++) {
    await coverBans(page);
    await page.getByRole("button", { name: "Play to…" }).click();
    await page.getByRole("radio", { name: /The end of the season/ }).click();
    const start = Date.now();
    await page.getByRole("button", { name: "Play", exact: true }).click();
    const done = page.getByRole("button", { name: /^(Share|Play week \d+: .+|Replace .+ \(suspended\))$/ }).first();
    const half = page.getByRole("button", { name: "Continue" });
    await expect(done.or(half)).toBeVisible({ timeout: 20_000 });
    if (await half.isVisible().catch(() => false)) await half.click();
    await expect(done).toBeVisible({ timeout: 20_000 });
    fed += Date.now() - start;
  }
  expect(fed, "Play to the end, watched").toBeLessThanOrEqual(oldVidiprinterMs + 2000);
});

test("the draft is playable with the keyboard alone", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard flow runs on the desktop project");
  await openHome(page);
  await startNewCareer(page);
  await page.keyboard.press("d");
  await expect(page.getByRole("list", { name: "Cuttings" }).getByRole("button").first()).toBeVisible({ timeout: 10_000 });
  await page.getByRole("list", { name: "Cuttings" }).getByRole("button").first().focus();
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
