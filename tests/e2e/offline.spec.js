import { test, expect } from "@playwright/test";
import { openHome, startNewCareer } from "./helpers.js";

// Phase 1 spec §9.3 test 3: once the service worker has installed, an
// offline reload still plays.
test("an offline reload still drafts", async ({ page, context, browserName }) => {
  test.skip(browserName === "webkit", "service workers are not exposed to Playwright's WebKit");
  await openHome(page);
  await page.waitForFunction(() => navigator.serviceWorker?.controller || navigator.serviceWorker?.ready.then(() => true), null, { timeout: 30_000 });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForTimeout(1500);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Era XI" })).toBeVisible();
  await startNewCareer(page);
  await page.getByRole("button", { name: "Draw", exact: true }).click();
  await expect(page.getByRole("list", { name: "Cuttings" }).getByRole("button").first()).toBeVisible({ timeout: 10_000 });
  await context.setOffline(false);
});
