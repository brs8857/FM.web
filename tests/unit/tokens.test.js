// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { checkContrast, parseThemes, contrast, PAIRS } from "../../scripts/check-contrast.mjs";

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

  it("uses the spec's newsprint and floodlit values", () => {
    const themes = parseThemes(tokens);
    expect(themes.light).toMatchObject({ paper: "#F4EFE4", ink: "#1A1A1A", signal: "#E8A33D", slate: "#1E3D2F", chalk: "#F7F3EA" });
    expect(themes.dark).toMatchObject({ paper: "#15181C", ink: "#ECE7DA", signal: "#E8A33D", slate: "#17302A", action: "#ECE7DA" });
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

describe("bundled fonts", () => {
  const files = [...base.matchAll(/url\("\.\/fonts\/([^"]+)"\)/g)].map((m) => m[1]);

  it("declares the six faces from the spec", () => {
    expect(files).toEqual([
      "barlow-latin-400-normal.woff2", "barlow-latin-600-normal.woff2",
      "barlow-condensed-latin-600-normal.woff2", "barlow-condensed-latin-800-normal.woff2",
      "ibm-plex-mono-latin-400-normal.woff2", "ibm-plex-mono-latin-600-normal.woff2",
    ]);
  });

  it("ships each face and its licence beside the stylesheet, so the standalone build inlines them", () => {
    for (const f of files) expect(existsSync(`src/styles/fonts/${f}`), f).toBe(true);
    for (const l of ["LICENSE-Barlow.txt", "LICENSE-BarlowCondensed.txt", "LICENSE-IBMPlexMono.txt"]) {
      expect(readFileSync(`src/styles/fonts/${l}`, "utf8")).toContain("SIL OPEN FONT LICENSE Version 1.1");
    }
  });

  it("never fetches fonts from the network", () => {
    expect(base).not.toMatch(/https?:\/\//);
    expect(tokens).not.toMatch(/https?:\/\//);
  });
});
