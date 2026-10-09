// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { checkContrast, parseThemes, contrast, PAIRS } from "../../scripts/check-contrast.mjs";
import { hexToHsl } from "../../src/content/clubTheme.js";

const tokens = readFileSync("src/styles/tokens.css", "utf8");
const base = readFileSync("src/styles/base.css", "utf8");

const COLOUR_TOKENS = ["paper", "paper-2", "rule", "ink", "ink-2", "signal", "signal-ink", "slate", "chalk", "win", "draw", "loss", "action"];

describe("design tokens", () => {
  it("defines every colour token in the light, dark and system-dark blocks", () => {
    const themes = parseThemes(tokens);
    for (const name of COLOUR_TOKENS) {
      expect(themes.light[name], `light --${name}`).toMatch(/^#[0-9A-F]{6}$/);
      expect(themes.dark[name], `dark --${name}`).toMatch(/^#[0-9A-F]{6}$/);
      expect(themes.darkAuto[name], `system dark --${name}`).toBe(themes.dark[name]);
    }
  });

  it("sets every hue at full saturation, not the stock greens of generated apps", () => {
    const themes = parseThemes(tokens);
    expect(themes.light).toMatchObject({ paper: "#F4F4F0", ink: "#1A1B18", signal: "#55FF00", slate: "#006923", chalk: "#F3F2EA", action: "#008221", win: "#047A00", loss: "#D10E00" });
    expect(themes.dark).toMatchObject({ paper: "#121411", ink: "#EDEEE7", signal: "#55FF00", slate: "#005E1F", action: "#15FF00", win: "#09FF00", loss: "#FF2B1C" });
    for (const [mode, theme] of Object.entries({ light: themes.light, dark: themes.dark })) {
      for (const hue of ["signal", "slate", "action", "win", "loss"]) expect(hexToHsl(theme[hue]).s, `${mode} --${hue}`).toBeGreaterThan(0.97);
    }
    const stock = ["#2ECC71", "#27AE60", "#34C759", "#30D158", "#22C55E", "#16A34A", "#10B981", "#059669"];
    for (const theme of [themes.light, themes.dark]) expect(Object.values(theme).filter((hex) => stock.includes(hex))).toEqual([]);
  });

  it("guards system dark behind an explicit light theme", () => {
    expect(tokens).toMatch(/@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-theme="light"\]\)/);
  });

  it("passes every AA pair in both themes", () => {
    const { results, mismatched } = checkContrast(tokens);
    expect(mismatched).toEqual([]);
    expect(results).toHaveLength(PAIRS.length * 2);
    expect(results.filter((r) => !r.ok)).toEqual([]);
  });

  it("computes WCAG contrast", () => {
    expect(contrast("#FFFFFF", "#000000")).toBeCloseTo(21, 5);
    expect(contrast("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrast("#777777", "#FFFFFF")).toBeCloseTo(4.48, 2);
  });

  it("scales type from the root so system text size applies", () => {
    expect(base).toMatch(/html\s*\{[^}]*font-size:\s*100%/);
    expect(tokens).toMatch(/--text-3xl:\s*3\.5rem/);
  });
});

describe("type", () => {
  it("sets the device's own face, with Courier only for the vidiprinter, and bundles no web fonts", () => {
    expect(base).not.toMatch(/@font-face/);
    expect(tokens).toMatch(/--font-system:\s*system-ui, -apple-system/);
    for (const role of ["headline", "body", "display"]) expect(tokens).toMatch(new RegExp(`--font-${role}:\\s*var\\(--font-system\\)`));
    expect(tokens).toMatch(/--font-mono:\s*"Courier New"/);
    // The faces AI-built sites reach for, and the ones this game used to ship.
    for (const face of ["Inter", "Geist", "Poppins", "Montserrat", "Space Grotesk", "DM Sans", "Plus Jakarta", "Oswald", "Bebas", "Barlow", "Newsreader", "Fraunces", "Playfair", "Instrument Serif", "JetBrains Mono", "IBM Plex", "Courier Prime"]) {
      expect(`${base}\n${tokens}`, face).not.toContain(face);
    }
  });

  it("never fetches fonts from the network", () => {
    expect(base).not.toMatch(/https?:\/\//);
    expect(tokens).not.toMatch(/https?:\/\//);
  });
});
