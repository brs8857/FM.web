// Rebuilds src/data/players.json and src/data/championship.json from raw
// squad records, replacing the lost build_final.py (plan C0, docs/data.md).
//   node scripts/derive-ratings.mjs raw.json [--out src/data]
//   node scripts/derive-ratings.mjs --check     (recomputes the club fields from the shipped squads)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createRng } from "../src/engine/rng.js";
import { statsFromOv } from "../src/engine/players.js";
import { seasonLabel } from "../src/engine/util.js";

export const OV_RANGE = [38, 96];
export const OV_CURVE = 0.45;
// The two pools were built with different yardsticks; both are kept as shipped.
export const RIVALS = { referenceYear: 2024, gapPenalty: 2.5, gapCap: 14, weight: [0.8, 1.22], vol: [5, 15] };
export const POOL = { referenceYear: 2025, gapPenalty: 2.2, gapCap: 16, weight: [0.78, 1.18], vol: [6, 17] };

// Python's round(): half to even, which the shipped numbers were made with.
export function roundTo(v, places) {
  const factor = 10 ** places;
  const scaled = v * factor;
  const floor = Math.floor(scaled);
  const diff = scaled - floor;
  const rounded = Math.abs(diff - 0.5) < 1e-9 ? (floor % 2 === 0 ? floor : floor + 1) : Math.round(scaled);
  return rounded / factor;
}
const round1 = (v) => roundTo(v, 1);
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const popStd = (xs) => { const m = mean(xs); return Math.sqrt(mean(xs.map((x) => (x - m) ** 2))); };

// Market value carries an age premium (a 21-year-old is priced on what he
// might become); the overall is meant to rate the season he actually had.
export function ageValuePremium(age) {
  if (age == null) return 0;
  return Math.max(-0.3, Math.min(0.6, (27 - age) * 0.06));
}

// One season's rows share a distribution: the overall is the player's rank
// among everyone in the league that season, so inflation across decades
// cancels out. The curve puts the mean in the high 70s, as the shipped data.
export function overallsForSeason(rows) {
  const scored = rows.map((r, i) => ({ i, score: Math.log(Math.max(1, r.value)) - ageValuePremium(r.age) }));
  scored.sort((a, b) => a.score - b.score);
  const out = new Array(rows.length);
  scored.forEach(({ i }, rank) => {
    const pct = scored.length > 1 ? rank / (scored.length - 1) : 1;
    out[i] = Math.round(OV_RANGE[0] + (OV_RANGE[1] - OV_RANGE[0]) * pct ** OV_CURVE);
  });
  return out;
}

function hashSeed(text) {
  let h = 2166136261;
  for (const ch of text) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function buildSquads(raw) {
  const bySeason = new Map();
  for (const r of raw.rows) {
    const key = `${r.year}_${r.club}`;
    if (!bySeason.has(key)) bySeason.set(key, []);
    bySeason.get(key).push(r);
  }
  const byYear = new Map();
  for (const [key, rows] of bySeason) {
    const year = key.split("_")[0];
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push(...rows.map((r) => ({ r, key })));
  }
  const overall = new Map();
  for (const rows of byYear.values()) {
    const ovs = overallsForSeason(rows.map((x) => x.r));
    rows.forEach((x, i) => overall.set(x.r, ovs[i]));
  }
  const squads = {};
  for (const [key, rows] of [...bySeason].sort()) {
    squads[key] = rows.map((r) => {
      const ov = overall.get(r);
      const rng = createRng(hashSeed(`${key}|${r.name}|${r.slot}`));
      const stats = statsFromOv(r.slot, ov, rng);
      return [r.name, r.slot, r.side || "", r.age ?? null, r.nat, ov, ...Object.values(stats)];
    });
  }
  return squads;
}

export function buildIndex(squads, clubs) {
  return Object.keys(squads).map((key) => {
    const [y, c] = key.split("_");
    return { y, c, label: `${clubs[c]} ${seasonLabel(Number(y))}` };
  });
}

// Every club's history from the squads: the mean overall of each season it
// has on file. The most recent season sets today's strength, less a penalty
// for seasons away from the top flight.
export function clubHistory(squads, slug) {
  const seasons = Object.keys(squads).filter((k) => k.endsWith(`_${slug}`)).sort();
  const means = seasons.map((k) => mean(squads[k].map((row) => row[5])));
  return { seasons, means, lastYear: seasons.length ? Number(seasons.at(-1).slice(0, 4)) : null };
}

export function clubStrength(history, { referenceYear, gapPenalty, gapCap }) {
  const { means, lastYear } = history;
  const gap = Math.max(0, referenceYear - lastYear);
  return {
    ov: round1(means.at(-1) - Math.min(gapCap, gapPenalty * gap)),
    lastSeason: String(lastYear),
    histMean: round1(mean(means)),
    histStd: round1(popStd(means)),
  };
}

// weight (pedigree) and vol (volatility) are min-max scaled across the pool
// the club sits in, so they compare clubs with each other, not with a fixed
// yardstick.
export function scalePool(clubs, { weight, vol }) {
  const scale = (values, [lo, hi], places) => {
    const min = Math.min(...values), max = Math.max(...values);
    return values.map((v) => roundTo(lo + (hi - lo) * (max > min ? (v - min) / (max - min) : 0), places));
  };
  const weights = scale(clubs.map((c) => c.histMean), weight, 3);
  const vols = scale(clubs.map((c) => c.histStd), vol, 2);
  return clubs.map((c, i) => ({ ...c, weight: weights[i], vol: vols[i] }));
}

export function buildRivals(squads, clubs, slugs) {
  const rivals = slugs.map((slug) => ({ name: clubs[slug], ...clubStrength(clubHistory(squads, slug), RIVALS) }));
  return scalePool(rivals, RIVALS);
}

// A pool entry is a slug (history on file) or a fixed profile { name, ov,
// histStd } for a club with no top-flight season in the window.
export function buildPool(squads, clubs, entries) {
  const pool = entries.map((entry) => {
    if (typeof entry === "string") {
      const { ov, histMean, histStd } = clubStrength(clubHistory(squads, entry), POOL);
      return { name: clubs[entry], ov, histMean, histStd };
    }
    return { name: entry.name, ov: entry.ov, histMean: entry.ov, histStd: entry.histStd };
  });
  return scalePool(pool, POOL);
}

export function buildDataset(raw) {
  const squads = buildSquads(raw);
  const index = buildIndex(squads, raw.clubs);
  const opponents = buildRivals(squads, raw.clubs, raw.rivals);
  const championship = buildPool(squads, raw.clubs, raw.pool);
  return { players: { clubs: raw.clubs, squads, index, opponents }, championship };
}

// Recomputes the club fields from the shipped squads and reports every
// field that differs from the shipped opponents and pool.
export function checkShipped(players, championship) {
  const slugByName = Object.fromEntries(Object.entries(players.clubs).map(([slug, name]) => [name, slug]));
  const slugFor = (name) => slugByName[name] ?? Object.entries(players.clubs).find(([, n]) => n.startsWith(name))?.[0];
  const rivals = buildRivals(players.squads, players.clubs, players.opponents.map((o) => slugFor(o.name)));
  const pool = buildPool(players.squads, players.clubs, championship.map((c) => {
    const slug = slugFor(c.name);
    return slug && clubHistory(players.squads, slug).seasons.length ? slug : { name: c.name, ov: c.ov, histStd: c.histStd };
  }));
  const diffs = [];
  const compare = (label, shipped, rebuilt) => {
    for (const key of ["ov", "histMean", "histStd", "weight", "vol"]) {
      if (Math.abs(shipped[key] - rebuilt[key]) > 0.011) diffs.push(`${label} ${shipped.name}.${key}: shipped ${shipped[key]}, rebuilt ${rebuilt[key]}`);
    }
  };
  players.opponents.forEach((o, i) => compare("rival", o, { ...rivals[i], name: o.name }));
  championship.forEach((c, i) => compare("pool", c, { ...pool[i], name: c.name }));
  return diffs;
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("--check")) {
    const players = JSON.parse(readFileSync("src/data/players.json", "utf8"));
    const championship = JSON.parse(readFileSync("src/data/championship.json", "utf8"));
    const diffs = checkShipped(players, championship);
    console.log(diffs.length ? diffs.join("\n") : `club fields match for ${players.opponents.length} rivals and ${championship.length} pool clubs`);
    process.exit(diffs.length ? 1 : 0);
  }
  const input = args.find((a) => !a.startsWith("--"));
  if (!input) { console.error("usage: node scripts/derive-ratings.mjs raw.json [--out dir] | --check"); process.exit(2); }
  const outIndex = args.indexOf("--out");
  const outDir = outIndex >= 0 ? args[outIndex + 1] : "src/data";
  const { players, championship } = buildDataset(JSON.parse(readFileSync(input, "utf8")));
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "players.json"), JSON.stringify(players) + "\n");
  writeFileSync(join(outDir, "championship.json"), JSON.stringify(championship, null, 1) + "\n");
  console.log(`${Object.keys(players.squads).length} squads, ${players.index.length} index entries, ${players.opponents.length} rivals, ${championship.length} pool clubs → ${outDir}`);
}

if (process.argv[1]?.endsWith("derive-ratings.mjs")) main();
