import { test, expect } from "@playwright/test";
import { openHome, draftFullXI, startNewCareer } from "./helpers.js";

// The gestures of the apple-design pass, in a real browser: a sheet is dragged
// 1:1 and let go by where the flick was heading; a board marker stays under
// the finger where it was grabbed.

async function openDefinition(page) {
  await page.getByRole("button", { name: "New career" }).click();
  await page.getByRole("button", { name: "Choose an era" }).click();
  await page.getByRole("button", { name: "years", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.waitForTimeout(600); // the entrance spring has settled
  return dialog;
}

const offsetOf = (dialog) => dialog.evaluate((el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m42);

test.describe("a sheet on a phone", () => {
  test.beforeEach(({ isMobile }) => test.skip(!isMobile, "the grip is for the phone layout"));

  test("follows the finger, springs back from a short slow drag, and goes on a flick", async ({ page }) => {
    await openHome(page);
    const dialog = await openDefinition(page);
    const grip = (await dialog.locator("div").first().boundingBox());
    const x = grip.x + grip.width / 2, y = grip.y + grip.height / 2;

    // 1:1 tracking, then a short slow drag lets go and returns.
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + 40, { steps: 8 });
    expect(await offsetOf(dialog)).toBeCloseTo(40, 0);
    await page.waitForTimeout(500);
    await page.mouse.up();
    await expect.poll(() => offsetOf(dialog), { timeout: 2000 }).toBeCloseTo(0, 0);
    await expect(dialog).toBeVisible();

    // Pulled up it resists: it follows, but by less than the finger moved.
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y - 100, { steps: 8 });
    const up = await offsetOf(dialog);
    expect(up).toBeLessThan(0);
    expect(up).toBeGreaterThan(-100);
    await page.mouse.up();
    await expect.poll(() => offsetOf(dialog), { timeout: 2000 }).toBeCloseTo(0, 0);

    // A short, fast flick down carries it off, by the way it came.
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + 60, { steps: 3 });
    await page.mouse.up();
    await expect(dialog).toBeHidden({ timeout: 2000 });
  });
});

test("a board marker stays under the finger where it was grabbed", async ({ page, isMobile }) => {
  test.skip(isMobile, "drag with a mouse on the desktop project");
  await openHome(page);
  await startNewCareer(page);
  await draftFullXI(page);
  await page.getByRole("tab", { name: "Board" }).click();

  const marker = page.locator("[data-slot-id]").filter({ hasText: /\w{3}/ }).nth(2);
  const disc = await marker.locator("span").first().boundingBox();
  const centre = { x: disc.x + disc.width / 2, y: disc.y + disc.height / 2 };
  // Grab it 14 px below the centre, on its name, not on the disc.
  const grab = { x: centre.x + 3, y: centre.y + 14 };
  await page.mouse.move(grab.x, grab.y);
  await page.mouse.down();
  await page.mouse.move(grab.x + 6, grab.y + 6, { steps: 2 });
  await page.mouse.move(grab.x + 50, grab.y - 30, { steps: 6 });

  const ghost = page.locator("[data-drag-ghost]");
  await expect(ghost).toBeVisible();
  const g = await ghost.boundingBox();
  const ghostCentre = { x: g.x + g.width / 2, y: g.y + g.height / 2 };
  // The ghost is the marker's centre, held the same distance from the finger.
  expect(ghostCentre.x - (grab.x + 50)).toBeCloseTo(-3, 0);
  expect(ghostCentre.y - (grab.y - 30)).toBeCloseTo(-14, 0);

  await page.mouse.up();
  await expect(ghost).toBeHidden();
  // Dropped on open pitch, it lands where it was drawn: no jump.
  const after = await marker.locator("span").first().boundingBox();
  expect(after.x + after.width / 2).toBeCloseTo(ghostCentre.x, -1);
  expect(after.y + after.height / 2).toBeCloseTo(ghostCentre.y, -1);
});

test("with reduced motion a sheet cross-fades instead of travelling", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openHome(page);
  await page.getByRole("button", { name: "New career" }).click();
  await page.getByRole("button", { name: "Choose an era" }).click();
  await page.getByRole("button", { name: "years", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const animation = await dialog.evaluate((el) => getComputedStyle(el).animationName);
  expect(animation).toMatch(/fade-in/);
  expect(animation).not.toMatch(/sheet-in|dialog-in/);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden({ timeout: 1000 });
});
