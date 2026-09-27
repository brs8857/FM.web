// @vitest-environment node
import { describe, it, expect } from "vitest";
import { encodeCareerCode, decodeCareerCode, normalizeCareerCode } from "./careerCode.js";

describe("career code", () => {
  it("round-trips the seed, era and shape as six groups of two", () => {
    const input = { seed: 0xdeadbeef, eraMin: 1996, eraMax: 2013, formationKey: "3-5-2", league: "top" };
    const code = encodeCareerCode(input);
    expect(code).toMatch(/^[0-9A-Z]{2}(-[0-9A-Z]{2}){5}$/);
    expect(decodeCareerCode(code)).toEqual(input);
    expect(decodeCareerCode(code.toLowerCase().replaceAll("-", " "))).toEqual(input);
  });

  it("covers the whole seed range and every formation", () => {
    for (const seed of [0, 1, 0xffffffff, 4242, 20260925]) {
      for (const formationKey of ["4-3-3", "4-4-2", "4-2-3-1", "3-5-2", "3-4-3", "5-3-2", "4-1-4-1"]) {
        const input = { seed, eraMin: 1992, eraMax: 2025, formationKey, league: "top" };
        expect(decodeCareerCode(encodeCareerCode(input))).toEqual(input);
      }
    }
  });

  it("carries the league in the version bits, and reads every code made before the Championship as the top flight", () => {
    const input = { seed: 77, eraMin: 2016, eraMax: 2025, formationKey: "4-2-3-1", league: "championship" };
    const code = encodeCareerCode(input);
    expect(decodeCareerCode(code)).toEqual(input);
    expect(encodeCareerCode({ ...input, league: "top" })).not.toBe(code);
    // A 2.8 code: version 0, no league field.
    expect(decodeCareerCode(encodeCareerCode({ seed: 77, eraMin: 1992, eraMax: 2024, formationKey: "4-4-2" })).league).toBe("top");
  });

  it("forgives the confusable letters and rejects damaged codes", () => {
    expect(normalizeCareerCode("o1-il")).toBe("0111");
    const code = encodeCareerCode({ seed: 99, eraMin: 2000, eraMax: 2009, formationKey: "4-4-2" });
    expect(decodeCareerCode(code.slice(0, -1))).toBeNull();
    const chars = code.replaceAll("-", "");
    const flipped = chars.slice(0, 3) + (chars[3] === "A" ? "B" : "A") + chars.slice(4);
    expect(decodeCareerCode(flipped)).toBeNull();
    expect(decodeCareerCode("UU-UU-UU-UU-UU-UU")).toBeNull();
    expect(decodeCareerCode("")).toBeNull();
  });
});
