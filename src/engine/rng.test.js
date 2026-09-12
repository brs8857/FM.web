// @vitest-environment node
import { describe, it, expect } from "vitest";
import { createRng, deriveSeed } from "./rng.js";
import { mulberry32 } from "../../scripts/capture-golden.mjs";

describe("createRng", () => {
  it("is mulberry32 and repeats exactly for the same seed", () => {
    const a = createRng(42);
    const b = createRng(42);
    const reference = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const value = a.next();
      expect(value).toBe(b.next());
      expect(value).toBe(reference());
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
    expect(createRng(43).next()).not.toBe(createRng(42).next());
  });

  it("int and pick stay in range", () => {
    const rng = createRng(7);
    for (let i = 0; i < 500; i++) {
      const n = rng.int(5);
      expect(Number.isInteger(n) && n >= 0 && n < 5).toBe(true);
    }
    const items = ["a", "b", "c"];
    for (let i = 0; i < 50; i++) expect(items).toContain(rng.pick(items));
  });

  it("shuffle returns a permutation without modifying its input", () => {
    const input = [1, 2, 3, 4, 5, 6];
    const copy = [...input];
    const out = createRng(3).shuffle(input);
    expect(input).toEqual(copy);
    expect(out).not.toBe(input);
    expect([...out].sort((x, y) => x - y)).toEqual(copy);
  });

  it("shuffle is fair (each position equally likely)", () => {
    const rng = createRng(12345);
    const counts = Array.from({ length: 5 }, () => new Array(5).fill(0));
    const trials = 10000;
    for (let t = 0; t < trials; t++) {
      rng.shuffle([0, 1, 2, 3, 4]).forEach((value, position) => { counts[value][position]++; });
    }
    // Expected 2000 per cell; chi-square with 16 degrees of freedom stays well under 40 for a fair shuffle.
    let chiSquare = 0;
    for (const row of counts) for (const c of row) chiSquare += (c - trials / 5) ** 2 / (trials / 5);
    expect(chiSquare).toBeLessThan(40);
  });
});

describe("deriveSeed", () => {
  it("is deterministic, unsigned 32-bit, and differs for neighbouring counters", () => {
    expect(deriveSeed(99, 0)).toBe(deriveSeed(99, 0));
    const seeds = new Set();
    for (let counter = 0; counter < 1000; counter++) {
      const s = deriveSeed(2893411307, counter);
      expect(Number.isInteger(s) && s >= 0 && s <= 0xffffffff).toBe(true);
      seeds.add(s);
    }
    expect(seeds.size).toBe(1000);
    expect(createRng(deriveSeed(1, 0)).next()).not.toBe(createRng(deriveSeed(1, 1)).next());
  });
});
