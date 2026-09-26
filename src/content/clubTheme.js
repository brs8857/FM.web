import { contrast } from "../styles/contrast.js";
import { clubName } from "./clubs.js";
import colours from "./clubColours.json";

// Derives the full token set (spec 04 §3.2) from a club's two colours. The
// hue of each colour is kept; lightness is solved per token until every pair
// in scripts/check-contrast.mjs PAIRS holds, so any two inputs (two whites,
// two blacks, a low-contrast kit) still give a legible theme.
//
// Roles: the "tint" is the first chromatic colour (paper, ink, rule, action);
// the "accent" is the second colour when it is chromatic too (signal, slate,
// chalk), otherwise the tint. A club with two neutral colours gets a
// monochrome theme with a silver signal. Win, draw and loss keep their fixed
// green, grey and red hues so a result means the same thing under every club,
// with only the lightness solved against the club's paper; the W/D/L letters
// carry the meaning where a red club's loss red or a green club's win green
// would otherwise read as a club colour.

export const COLOUR_TOKENS = ["paper", "paper-2", "rule", "ink", "ink-2", "signal", "signal-ink", "slate", "chalk", "win", "draw", "loss", "action"];

const CHROMA_MIN = 0.12;
const YELLOW = [35, 75];
const RESULT_HUES = { win: { h: 145, s: 0.6 }, draw: { h: 0, s: 0.03 }, loss: { h: 2, s: 0.5 } };

export const CLUBS = Object.entries(colours).map(([key, c]) => ({ key, name: c.name, colours: c.colours }));

export function clubDisplayName(key, mode) {
  return colours[key] ? clubName(colours[key].name, mode) : null;
}

export function clubTheme(key) {
  const club = colours[key];
  return club ? deriveClubTheme(club.colours[0], club.colours[1]) : null;
}

export function hexToHsl(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = Math.round(h * 60);
  return { h: (h + 360) % 360, s, l };
}

export function hslToHex({ h, s, l }) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const i = Math.floor(((h % 360) + 360) % 360 / 60);
  const [r, g, b] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][i];
  const hex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`.toUpperCase();
}

const chroma = ({ s, l }) => s * (1 - Math.abs(2 * l - 1));
const chromatic = (c) => chroma(c) >= CHROMA_MIN;
const yellowish = (c) => chromatic(c) && c.h >= YELLOW[0] && c.h <= YELLOW[1];
const dark = (c) => c.l < 0.25;
const NEUTRAL = { h: 0, s: 0, l: 0.5 };

// Steps lightness away from the backgrounds until every constraint holds.
// `constraints` are [background hex, minimum ratio]; `direction` is +1 for
// lighter, -1 for darker. Terminates at pure white or black, which passes
// against any of the near-white or near-black backgrounds used here.
function solve(base, constraints, direction) {
  let l = base.l;
  for (;;) {
    const hex = hslToHex({ ...base, l });
    if (constraints.every(([bg, min]) => contrast(hex, bg) >= min)) return hex;
    l += direction * 0.01;
    if (l <= 0) return hslToHex({ ...base, l: 0 });
    if (l >= 1) return hslToHex({ ...base, l: 1 });
  }
}

const withSat = (c, s, l) => ({ h: c.h, s: chromatic(c) ? Math.min(1, Math.max(s, c.s * 0.5)) : 0, l });
const tone = (c, s, l) => hslToHex(withSat(c, s, l));

function roles(primaryHex, secondaryHex) {
  const a = hexToHsl(primaryHex), b = hexToHsl(secondaryHex);
  const tint = chromatic(a) ? a : chromatic(b) ? b : NEUTRAL;
  const accent = chromatic(b) && tint !== b ? b : tint;
  const other = tint === a ? b : a;
  const board = !chromatic(accent) || (dark(other) && !chromatic(other)) ? { ...NEUTRAL, h: tint.h, s: 0.02 }
    : yellowish(accent) && !yellowish(tint) ? tint : accent;
  const action = yellowish(tint) && accent !== tint ? accent : tint;
  return { tint, accent, board, action };
}

export function deriveClubTheme(primaryHex, secondaryHex) {
  const { tint, accent, board, action } = roles(primaryHex, secondaryHex);
  const signalBase = chromatic(accent) ? { h: accent.h, s: Math.min(0.9, Math.max(accent.s, 0.55)), l: accent.l } : { h: 0, s: 0, l: 0.75 };
  const chalk = tone(accent, 0.3, 0.96);

  const light = {};
  light.paper = tone(tint, 0.45, 0.955);
  light["paper-2"] = tone(tint, 0.35, 0.915);
  light.rule = tone(tint, 0.2, 0.8);
  light.ink = solve(withSat(tint, 0.35, 0.09), [[light["paper-2"], 4.5]], -1);
  light["ink-2"] = solve(withSat(tint, 0.25, 0.32), [[light.paper, 6], [light["paper-2"], 4.5]], -1);
  light.slate = solve(withSat(board, 0.45, 0.2), [[chalk, 4.5]], -1);
  light.chalk = chalk;
  light.action = solve(withSat(action, 0.7, 0.42), [[light.paper, 4.5]], -1);
  light["signal-ink"] = light.ink;

  const darkT = {};
  darkT.paper = tone(tint, 0.2, 0.09);
  darkT["paper-2"] = tone(tint, 0.18, 0.135);
  darkT.rule = tone(tint, 0.15, 0.25);
  darkT.ink = solve(withSat(tint, 0.15, 0.93), [[darkT["paper-2"], 4.5]], 1);
  darkT["ink-2"] = solve(withSat(tint, 0.12, 0.68), [[darkT.paper, 6], [darkT["paper-2"], 4.5]], 1);
  darkT.slate = solve(withSat(board, 0.45, 0.17), [[chalk, 4.5]], -1);
  darkT.chalk = chalk;
  darkT.action = solve(withSat(action, 0.6, 0.5), [[darkT.paper, 4.5]], 1);
  darkT["signal-ink"] = light.ink;

  const signal = solve(signalBase, [[light.ink, 4.5], [light.slate, 3], [darkT.slate, 3]], 1);
  light.signal = signal;
  darkT.signal = signal;

  for (const [name, hue] of Object.entries(RESULT_HUES)) {
    const start = { win: 0.32, draw: 0.38, loss: 0.42 }[name];
    light[name] = solve({ ...hue, l: start }, [[light.paper, 4.5], [light["paper-2"], 4.5]], -1);
    darkT[name] = solve({ ...hue, l: start + 0.3 }, [[darkT.paper, 4.5], [darkT["paper-2"], 4.5]], 1);
  }

  return { light, dark: darkT };
}

// The derived tokens as a stylesheet with the same three blocks as
// tokens.css, so it overrides the static theme by cascade order alone and
// checkContrast() reads it exactly as it reads tokens.css.
export function clubThemeCss({ light, dark }) {
  const block = (tokens, scheme) => COLOUR_TOKENS.map((t) => `  --${t}: ${tokens[t]};`).join("\n") + `\n  color-scheme: ${scheme};`;
  return [
    `:root {\n${block(light, "light")}\n}`,
    `@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {\n${block(dark, "dark")}\n  }\n}`,
    `[data-theme="dark"] {\n${block(dark, "dark")}\n}`,
  ].join("\n");
}

// The same tokens as inline custom properties, for previewing one theme on
// an element (the gallery).
export function clubThemeVars(tokens) {
  return Object.fromEntries(COLOUR_TOKENS.map((t) => [`--${t}`, tokens[t]]));
}
