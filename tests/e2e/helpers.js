import { expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Opens the app on Home with the first-run slips already seen.
export async function openHome(page, path = "./") {
  await page.addInitScript(() => {
    const raw = window.localStorage.getItem("fmweb.prefs");
    const prefs = raw ? JSON.parse(raw) : {};
    const seen = new Set(prefs.seenNotes ?? []);
    seen.add("first-run");
    window.localStorage.setItem("fmweb.prefs", JSON.stringify({ ...prefs, seenNotes: [...seen] }));
  });
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1, name: "Era XI" })).toBeVisible();
}

export async function startNewCareer(page) {
  await page.getByRole("button", { name: "New career" }).click();
  await page.getByRole("button", { name: "Choose a shape" }).click();
  await page.getByRole("button", { name: "Start the draft" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Draft" })).toBeVisible();
}

// Drafts eleven through the real flow: Draw, open the first cutting, pick
// the first row, confirm. `onPick` runs with the cuttings on the desk.
export async function draftFullXI(page, { onPick } = {}) {
  for (let pick = 0; pick < 11; pick++) {
    const draw = page.getByRole("button", { name: "Draw", exact: true });
    await draw.click();
    const cuttings = page.getByRole("button", { name: /Club season/ });
    await expect(cuttings.first()).toBeVisible({ timeout: 10_000 });
    if (onPick) await onPick(page, pick);
    await cuttings.first().click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("li button").first().click();
    await page.getByRole("button", { name: "Pick", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await page.getByRole("button", { name: "Go to the board" }).click();
  await expect(page.getByRole("tab", { name: "Season" })).toBeVisible();
}

export async function setStyle(page, name = "Gegenpress") {
  await page.getByRole("tab", { name: "Board" }).click();
  await page.getByRole("radio", { name, exact: true }).click();
}

// Kick off, start the season after the reveal, skip the vidiprinter, and
// open the window from the back page.
export async function playSeasonToWindow(page, season = 1) {
  await page.getByRole("button", { name: `Kick off season ${season}` }).first().click();
  await page.getByRole("button", { name: `Start season ${season}` }).click({ timeout: 15_000 });
  const skip = page.getByRole("button", { name: "Skip to end" });
  if (await skip.isVisible().catch(() => false)) await skip.click();
  await page.getByRole("button", { name: "Open the window" }).first().click({ timeout: 20_000 });
  await expect(page.getByRole("heading", { name: /The window/ })).toBeVisible();
}

export async function expectNoHorizontalScroll(page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "horizontal overflow").toBeLessThanOrEqual(0);
}

export async function expectInViewport(page, locator) {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  expect(box, "element has a box").not.toBeNull();
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
}

export async function expectAxeClean(page, name) {
  const results = await new AxeBuilder({ page }).analyze();
  const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), `${name}: axe`).toEqual([]);
}
