// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { checkContrast, PAIRS, contrast } from "../../scripts/check-contrast.mjs";
import { slugFor } from "../../scripts/rekey-clubs.mjs";
import { CLUBS, COLOUR_TOKENS, clubTheme, clubDisplayName, deriveClubTheme, clubThemeCss, clubThemeVars, hexToHsl, hslToHex } from "./clubTheme.js";

const players = JSON.parse(readFileSync("src/data/players.json", "utf8"));
const championship = JSON.parse(readFileSync("src/data/championship.json", "utf8"));
const HEX = /^#[0-9A-F]{6}$/;

function failures(theme) {
  const { results, mismatched } = checkContrast(clubThemeCss(theme));
  return [...results.filter((r) => !r.ok).map((r) => `${r.theme} --${r.fg} on --${r.bg}: ${r.ratio.toFixed(2)} < ${r.min}`), ...mismatched];
}

describe("club colours", () => {
  it("has a primary and secondary for every club in the dataset, the opposition and the promotion pool", () => {
    const names = new Set([...Object.values(players.clubs), ...players.opponents.map((o) => o.name), ...championship.map((c) => c.name)]);
    const keys = new Set(CLUBS.map((c) => c.key));
    for (const name of names) expect(keys.has(slugFor(name)), name).toBe(true);
    for (const club of CLUBS) {
      expect(club.colours).toHaveLength(2);
      for (const hex of club.colours) expect(hex, club.key).toMatch(HEX);
      expect(club.key, club.name).toBe(slugFor(club.name));
    }
    expect(CLUBS.length).toBe(new Set([...names].map(slugFor)).size);
  });

  it("names a club in either mode and knows nothing about unknown keys", () => {
    expect(clubDisplayName("arsenal")).toBe("Arsenal");
    expect(clubDisplayName("arsenal", "edited")).toBe("Islington Reds");
    expect(clubDisplayName("nope")).toBeNull();
    expect(clubTheme("nope")).toBeNull();
  });
});

describe("club theme derivation", () => {
  it("converts hex to HSL and back", () => {
    expect(hexToHsl("#FFFFFF")).toEqual({ h: 0, s: 0, l: 1 });
    expect(hexToHsl("#EF0107").h).toBe(358);
    expect(contrast(hslToHex(hexToHsl("#034694")), "#034694")).toBeLessThan(1.02);
    expect(hslToHex({ h: 120, s: 1, l: 0.5 })).toBe("#00FF00");
  });

  it("passes every AA pair in both themes for every club in the roster", () => {
    const report = {};
    for (const club of CLUBS) {
      const bad = failures(clubTheme(club.key));
      if (bad.length) report[club.key] = bad;
    }
    expect(report).toEqual({});
    expect(CLUBS.length).toBeGreaterThan(50);
  });

  it("defines every token as a hex colour in both themes and renders the same three blocks as tokens.css", () => {
    for (const club of CLUBS) {
      const theme = clubTheme(club.key);
      for (const t of COLOUR_TOKENS) {
        expect(theme.light[t], `${club.key} light --${t}`).toMatch(HEX);
        expect(theme.dark[t], `${club.key} dark --${t}`).toMatch(HEX);
      }
      const { results } = checkContrast(clubThemeCss(theme));
      expect(results).toHaveLength(PAIRS.length * 2);
    }
    expect(clubThemeVars(clubTheme("arsenal").light)["--paper"]).toMatch(HEX);
  });

  it("holds for the awkward inputs: two whites, two blacks, one low-contrast kit, and identical colours", () => {
    for (const [a, b] of [["#FFFFFF", "#FFFFFF"], ["#000000", "#000000"], ["#FFF200", "#FFFFFF"], ["#1B4599", "#1B4599"], ["#808080", "#7F7F7F"], ["#000000", "#FFFFFF"]]) {
      expect(failures(deriveClubTheme(a, b)), `${a} ${b}`).toEqual([]);
    }
  });

  it("keeps each club's hue rather than collapsing to one grey", () => {
    const hue = (hex) => hexToHsl(hex).h;
    const arsenal = clubTheme("arsenal"), chelsea = clubTheme("chelsea"), villa = clubTheme("aston-villa");
    expect(Math.abs(hue(arsenal.light.paper) - hue(chelsea.light.paper))).toBeGreaterThan(90);
    expect(arsenal.light.slate).not.toBe(chelsea.light.slate);
    expect(arsenal.dark.paper).not.toBe(chelsea.dark.paper);
    expect(Math.abs(hue(villa.light.signal) - hexToHsl("#95BFE5").h)).toBeLessThanOrEqual(2);
    expect(Math.abs(hue(villa.light.action) - hexToHsl("#670E36").h)).toBeLessThanOrEqual(2);
    expect(hexToHsl(clubTheme("newcastle-united").light.paper).s).toBe(0);
  });

  it("keeps the result colours on their fixed hues and apart from each other", () => {
    for (const club of CLUBS) {
      for (const mode of ["light", "dark"]) {
        const t = clubTheme(club.key)[mode];
        expect(Math.abs(hexToHsl(t.win).h - 145), `${club.key} ${mode} win`).toBeLessThanOrEqual(2);
        expect(hexToHsl(t.loss).h, `${club.key} ${mode} loss`).toBeLessThanOrEqual(4);
        expect(contrast(t.win, t.loss), `${club.key} ${mode} win vs loss`).toBeGreaterThan(1);
        expect(new Set([t.win, t.draw, t.loss]).size).toBe(3);
      }
    }
  });
});
