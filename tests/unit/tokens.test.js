// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { checkContrast, parseThemes, contrast, PAIRS, SECTION_PAIRS } from "../../scripts/check-contrast.mjs";
import { hexToHsl } from "../../src/content/clubTheme.js";

const tokens = readFileSync("src/styles/tokens.css", "utf8");
const base = readFileSync("src/styles/base.css", "utf8");

const COLOUR_TOKENS = ["paper", "paper-2", "rule", "ink", "ink-2", "signal", "signal-ink", "slate", "chalk", "win", "draw", "loss", "action", "action-ink", "accent", "desk", "squad", "board", "season", "club"];

describe("design tokens", () => {
  it("defines every colour token in the light, dark and system-dark blocks", () => {
    const themes = parseThemes(tokens);
    for (const name of COLOUR_TOKENS) {
      expect(themes.light[name], `light --${name}`).toMatch(/^#[0-9A-F]{6}$/);
      expect(themes.dark[name], `dark --${name}`).toMatch(/^#[0-9A-F]{6}$/);
      expect(themes.darkAuto[name], `system dark --${name}`).toBe(themes.dark[name]);
    }
  });

  it("uses the colour wheel at full strength, not the stock greens of AI-built apps", () => {
    const themes = parseThemes(tokens);
    expect(themes.light).toMatchObject({ paper: "#FFFFFF", ink: "#0A0A0A", signal: "#FFEA00", slate: "#007016", desk: "#F76700", squad: "#004DFF", board: "#00AD17", season: "#ED0014", club: "#A200FF" });
    expect(themes.dark).toMatchObject({ paper: "#0B0B0B", ink: "#F5F5F5", signal: "#FFEA00", slate: "#006614", desk: "#FF6A00", board: "#00FF22" });
    for (const [mode, theme] of Object.entries({ light: themes.light, dark: themes.dark })) {
      for (const hue of ["signal", "slate", "win", "draw", "loss", "action", "accent", "desk", "squad", "board", "season", "club"]) {
        expect(hexToHsl(theme[hue]).s, `${mode} --${hue}`).toBeGreaterThan(0.97);
      }
    }
    const stock = ["#2ECC71", "#27AE60", "#34C759", "#30D158", "#22C55E", "#16A34A", "#10B981", "#059669"];
    for (const theme of [themes.light, themes.dark]) expect(Object.values(theme).filter((hex) => stock.includes(hex))).toEqual([]);
  });

  it("gives each tab its own hue unless a club's colours are chosen", () => {
    for (const section of ["squad", "board", "season", "club"]) {
      expect(tokens).toContain(`:root:not([data-club]) [data-section="${section}"] { --action: var(--${section}); --action-ink: var(--${section}-ink); --accent: var(--${section}); }`);
    }
  });

  it("guards system dark behind an explicit light theme", () => {
    expect(tokens).toMatch(/@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-theme="light"\]\)/);
  });

  it("passes every AA pair in both themes", () => {
    const { results, mismatched } = checkContrast(tokens, [...PAIRS, ...SECTION_PAIRS]);
    expect(mismatched).toEqual([]);
    expect(results).toHaveLength((PAIRS.length + SECTION_PAIRS.length) * 2);
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
