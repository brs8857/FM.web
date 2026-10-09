// @vitest-environment node
import { describe, it, expect } from "vitest";
import { project, rubberband, releaseVelocity, shouldDismiss, exitDuration } from "./gesture.js";

describe("gesture arithmetic", () => {
  it("projects a flick the way scrolling decelerates", () => {
    expect(project(0)).toBe(0);
    expect(project(1000)).toBeCloseTo(499, 0);
    expect(project(-1000)).toBeCloseTo(-499, 0);
  });

  it("resists harder the further past an edge, and never follows one for one", () => {
    expect(rubberband(0, 400)).toBe(0);
    const near = rubberband(20, 400), far = rubberband(200, 400);
    expect(near).toBeGreaterThan(0);
    expect(near).toBeLessThan(20);
    expect(far).toBeLessThan(200);
    expect(far / 200).toBeLessThan(near / 20);
    expect(rubberband(-50, 400)).toBeCloseTo(-rubberband(50, 400), 6);
  });

  it("reads release velocity from the last moments of the drag only", () => {
    const flick = [{ y: 0, t: 0 }, { y: 20, t: 40 }, { y: 60, t: 80 }, { y: 120, t: 100 }];
    expect(releaseVelocity(flick, 100)).toBeGreaterThan(900);
    const paused = [{ y: 0, t: 0 }, { y: 200, t: 50 }, { y: 200, t: 400 }, { y: 200, t: 420 }];
    expect(releaseVelocity(paused, 420)).toBe(0);
    expect(releaseVelocity([{ y: 5, t: 0 }], 10)).toBe(0);
    // A fast pull, then the finger held still for half a second before lifting.
    const held = [{ y: 0, t: 0 }, { y: 120, t: 60 }];
    expect(releaseVelocity(held, 60)).toBeGreaterThan(1500);
    expect(releaseVelocity(held, 560)).toBe(0);
  });

  it("dismisses on where the sheet is heading, not only where it is", () => {
    const height = 500;
    expect(shouldDismiss({ offset: 30, velocity: 0, height })).toBe(false);
    expect(shouldDismiss({ offset: 130, velocity: 0, height })).toBe(true);
    expect(shouldDismiss({ offset: 30, velocity: 1200, height })).toBe(true);
    expect(shouldDismiss({ offset: 130, velocity: -600, height })).toBe(false);
    expect(shouldDismiss({ offset: 60, velocity: 40, height: 200 })).toBe(false);
    expect(shouldDismiss({ offset: 90, velocity: 40, height: 200 })).toBe(true);
  });

  it("finishes the exit at the finger's own speed, within calm and snappy bounds", () => {
    expect(exitDuration({ remaining: 400, velocity: 2000 })).toBe(200);
    expect(exitDuration({ remaining: 400, velocity: 0 })).toBe(320);
    expect(exitDuration({ remaining: 20, velocity: 3000 })).toBe(140);
  });
});
