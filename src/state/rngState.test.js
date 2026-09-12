// @vitest-environment node
import { describe, it, expect } from "vitest";
import { takeRng, newCareerSeed } from "./rngState.js";

describe("rngState", () => {
  it("takeRng returns a replayable rng and increments the counter without mutating", () => {
    const state = { careerSeed: 123, rngCounter: 4, other: "x" };
    const [a, next] = takeRng(state);
    const [b] = takeRng(state);
    expect(next).toEqual({ careerSeed: 123, rngCounter: 5, other: "x" });
    expect(state.rngCounter).toBe(4);
    expect(a.next()).toBe(b.next());
    expect(takeRng(next)[0].next()).not.toBe(takeRng(state)[0].next());
  });

  it("newCareerSeed gives unsigned 32-bit integers", () => {
    for (let i = 0; i < 20; i++) {
      const seed = newCareerSeed();
      expect(Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff).toBe(true);
    }
  });
});
