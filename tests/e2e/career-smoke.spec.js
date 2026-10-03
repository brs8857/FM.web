import { test, expect } from "@playwright/test";
import { openHome, startNewCareer, draftFullXI, setStyle, playSeasonToWindow, coverBans, finishSeason, finishPlayoffs, playTo, expectNoHorizontalScroll, expectInViewport, expectAxeClean } from "./helpers.js";

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
  await setStyle(page, "Park the bus");
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

  // The feed is timed in the page, from the vidiprinter appearing to it
  // leaving, so neither the swaps bans force nor this test's own lookups are
  // charged to it; the 2.5 budget was the feed alone, 38 lines at 350 ms.
  const oldVidiprinterMs = 38 * 350;
  await page.evaluate(() => {
    window.feedMs = 0;
    let since = null;
    new MutationObserver(() => {
      const on = Boolean(document.querySelector('[role="log"][aria-label="Vidiprinter"]'));
      if (on && since == null) since = performance.now();
      if (!on && since != null) { window.feedMs += performance.now() - since; since = null; }
    }).observe(document.body, { childList: true, subtree: true });
  });
  for (let run = 0; run < 40 && !(await page.getByRole("button", { name: "Share" }).isVisible().catch(() => false)); run++) {
    await coverBans(page);
    await page.getByRole("button", { name: "Play to…" }).click();
    await page.getByRole("radio", { name: /The end of the season/ }).click();
    await page.getByRole("button", { name: "Play", exact: true }).click();
    const done = page.getByRole("button", { name: /^(Share|Play week \d+: .+|Replace .+ \(suspended\))$/ }).first();
    const half = page.getByRole("button", { name: "Continue" });
    await done.or(half).first().waitFor({ timeout: 20_000 });
    if (await half.isVisible().catch(() => false)) await half.click();
    await done.waitFor({ timeout: 20_000 });
  }
  const fed = await page.evaluate(() => window.feedMs);
  expect(fed, "Play to the end, watched").toBeLessThanOrEqual(oldVidiprinterMs + 2000);
});

// Spec 08 §10: eleven and ten drafted by hand, then a whole season on
// Play to… with auto-cover on, which never stops for a ban.
test("drafts ten for the bench and plays a season through on auto-cover", async ({ page }) => {
  await openHome(page);
  await startNewCareer(page);
  await draftFullXI(page, { bench: "draft" });
  await page.getByRole("tab", { name: "Squad" }).click();
  await expect(page.getByRole("group", { name: "Bench" }).getByRole("button")).toHaveCount(10);
  await expectNoHorizontalScroll(page);
  await setStyle(page, "Gegenpress");
  await page.getByRole("button", { name: "Kick off season 1" }).last().click();
  await page.getByRole("button", { name: "Start season 1" }).last().click({ timeout: 15_000 });
  await page.getByRole("button", { name: "Play to…" }).click();
  await expect(page.getByRole("switch", { name: /Cover bans from the bench/ })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("radio", { name: /The end of the season/ }).click();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  const skip = page.getByRole("button", { name: "Skip to end" });
  if (await skip.isVisible().catch(() => false)) await skip.click();
  await expect(page.getByRole("button", { name: "Share" })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: /\(suspended\)$/ })).toHaveCount(0);
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

// Spec 09: a Championship career drafts from Championship seasons, plays 46
// weeks against 23 real rivals, and goes up, stays or plays off.
test("a Championship career: the league step, 46 weeks, the play-offs if they come, the window", async ({ page, isMobile }) => {
  await openHome(page);
  await page.getByRole("button", { name: "New career" }).click();
  await expect(page.getByText("1 of 4 · League")).toBeVisible();
  await expectAxeClean(page, "league step");
  await page.getByRole("radio", { name: /^Championship/ }).click();
  await page.getByRole("button", { name: "Choose an era" }).click();
  await expect(page.getByText("2016-17 to 2025-26")).toBeVisible();
  await page.getByRole("button", { name: "Choose a shape" }).click();
  await page.getByRole("button", { name: "Choose your colours" }).click();
  await expect(page.getByText(/played in the Championship since 2016-17/)).toBeVisible();
  await page.getByRole("button", { name: "Start the draft" }).click();
  await expectNoHorizontalScroll(page);
  await draftFullXI(page);
  await setStyle(page, "Gegenpress");
  await page.getByRole("tab", { name: "Season" }).click();
  await expect(page.getByRole("heading", { name: /Season 1 · 2026-27 · Championship/ })).toBeVisible();
  await expect(page.getByText("46 matches, home and away against 23 rivals.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Kick off season 1" }).last().click();
  await page.getByRole("button", { name: "Start season 1" }).last().click({ timeout: 15_000 });
  await expect(page.getByText("Week 1 of 46 · kick-off")).toBeVisible();
  await playTo(page, "The half");
  await finishSeason(page);
  await expect(page.getByRole("button", { name: /Final table/ })).toContainText("of 24");
  if (!isMobile) await expectAxeClean(page, "Championship back page");
  const playoffs = await finishPlayoffs(page);
  if (playoffs > 0) {
    await expect(page.getByRole("heading", { name: "The play-offs" })).toBeVisible();
    await expectAxeClean(page, "play-offs");
  }
  await page.getByRole("button", { name: "Open the window" }).first().click();
  await expect(page.getByRole("heading", { name: /The window/ })).toBeVisible();
  await expectNoHorizontalScroll(page);
});
