// Asserts the token pairs from spec 04 §3.2 meet WCAG AA in both themes.
// Usage: npm run check:contrast   (exit 1 on any failure)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// [foreground, background, minimum ratio]. 4.5 for text, 3 for large text and
// UI component boundaries, 6 where the spec promises more (--ink-2 on paper).
export const PAIRS = [
  ["ink", "paper", 4.5],
  ["ink", "paper-2", 4.5],
  ["ink-2", "paper", 6],
  ["ink-2", "paper-2", 4.5],
  ["paper", "action", 4.5],
  ["chalk", "slate", 4.5],
  ["signal-ink", "signal", 4.5],
  ["signal", "slate", 3],
  ["win", "paper", 4.5],
  ["draw", "paper", 4.5],
  ["loss", "paper", 4.5],
  ["win", "paper-2", 4.5],
  ["draw", "paper-2", 4.5],
  ["loss", "paper-2", 4.5],
];

export function parseThemes(css) {
  const blocks = {
    light: /:root\s*\{([^}]*)\}/.exec(css),
    dark: /\[data-theme="dark"\]\s*\{([^}]*)\}/.exec(css),
    darkAuto: /:root:not\(\[data-theme="light"\]\)\s*\{([^}]*)\}/.exec(css),
  };
  const themes = {};
  for (const [name, match] of Object.entries(blocks)) {
    if (!match) throw new Error(`tokens.css: missing ${name} block`);
    themes[name] = Object.fromEntries(
      [...match[1].matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [m[1], m[2].toUpperCase()]),
    );
  }
  return themes;
}

export function luminance(hex) {
  const channel = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel(n >> 16) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function checkContrast(css) {
  const themes = parseThemes(css);
  const results = [];
  for (const theme of ["light", "dark"]) {
    for (const [fg, bg, min] of PAIRS) {
      const colours = themes[theme];
      if (!colours[fg] || !colours[bg]) {
        results.push({ theme, fg, bg, min, ratio: 0, ok: false });
        continue;
      }
      const ratio = contrast(colours[fg], colours[bg]);
      results.push({ theme, fg, bg, min, ratio, ok: ratio >= min });
    }
  }
  const mismatched = Object.keys(themes.dark).filter((k) => themes.dark[k] !== themes.darkAuto[k]);
  return { results, mismatched };
}

function main() {
  const css = readFileSync(new URL("../src/styles/tokens.css", import.meta.url), "utf8");
  const { results, mismatched } = checkContrast(css);
  for (const r of results) {
    console.log(`${r.ok ? "ok  " : "FAIL"} ${r.theme.padEnd(5)} --${r.fg} on --${r.bg}: ${r.ratio.toFixed(2)} (min ${r.min})`);
  }
  if (mismatched.length) console.log(`FAIL dark and prefers-color-scheme blocks differ: ${mismatched.join(", ")}`);
  const failed = results.filter((r) => !r.ok).length + mismatched.length;
  if (failed) {
    console.error(`${failed} contrast check(s) failed`);
    process.exit(1);
  }
  console.log(`${results.length} contrast pairs pass`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
