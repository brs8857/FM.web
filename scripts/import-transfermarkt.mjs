// Builds the 2025-26 top-flight season and the Championship archive
// (2016-17 to 2025-26) from the Transfermarkt datalake published at
// https://github.com/salimt/football-datasets (docs/data.md, "The 2025-26
// season and the Championship"). The five CSVs it reads live outside the
// repository:
//   node scripts/import-transfermarkt.mjs <dir with the CSVs> [--out src/data]
// It leaves the 1992-2024 top-flight squads exactly as shipped and rebuilds
// every club-strength field from the squads, so `npm run data:check` holds.
import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { createRng } from "../src/engine/rng.js";
import { statsFromOv } from "../src/engine/players.js";
import { seasonLabel } from "../src/engine/util.js";
import { slugFor } from "./rekey-clubs.mjs";
import { OV_RANGE, OV_CURVE, ageValuePremium, hashSeed, buildDivisions } from "./derive-ratings.mjs";

export const TOP = "GB1";
export const SECOND = "GB2";
export const NEW_TOP_SEASON = 2025;
export const CHAMPIONSHIP_YEARS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
export const SQUAD_CAP = 22;
// A career in the top flight takes this club's place (as it always has);
// a Championship career takes the weakest 2025-26 Championship side's.
export const TOP_FLIGHT_PLACE = "fulham";

const seasonName = (y) => `${String(y % 100).padStart(2, "0")}/${String((y + 1) % 100).padStart(2, "0")}`;

// A CSV line splitter that honours quotes; the datalake has no fields that
// span lines.
export function splitCsv(line) {
  const out = [];
  let field = "", quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === "\"" && line[i + 1] === "\"") { field += "\""; i++; }
      else if (ch === "\"") quoted = false;
      else field += ch;
    } else if (ch === "\"") quoted = true;
    else if (ch === ",") { out.push(field); field = ""; }
    else field += ch;
  }
  out.push(field);
  return out;
}

async function eachRow(path, onRow) {
  const lines = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
  let header = null;
  for await (const line of lines) {
    if (!header) { header = splitCsv(line); continue; }
    const cells = splitCsv(line);
    const row = {};
    header.forEach((h, i) => { row[h] = cells[i] ?? ""; });
    onRow(row);
  }
}

// Transfermarkt's position strings onto the game's eight slots, with the side
// for full-backs and wide players.
export function slotFor(position) {
  const detail = String(position).split(" - ")[1] ?? "";
  switch (detail) {
    case "Goalkeeper": return ["GK", ""];
    case "Centre-Back": return ["CB", ""];
    case "Left-Back": return ["FB", "L"];
    case "Right-Back": return ["FB", "R"];
    case "Defensive Midfield": return ["DM", ""];
    case "Central Midfield": return ["CM", ""];
    case "Attacking Midfield": return ["AM", ""];
    case "Left Midfield": case "Left Winger": return ["WIDE", "L"];
    case "Right Midfield": case "Right Winger": return ["WIDE", "R"];
    case "Centre-Forward": case "Second Striker": return ["ST", ""];
    default: break;
  }
  if (/^Goalkeeper/.test(position)) return ["GK", ""];
  if (/^Defender/.test(position)) return ["CB", ""];
  if (/^Midfield/.test(position)) return ["CM", ""];
  return ["ST", ""];
}

// Transfermarkt disambiguates names with the player's id ("Wes Morgan
// (10003)"); a few profiles have no name at all, only the URL slug.
export function plainPlayerName(name, slug = "") {
  const plain = String(name).replace(/\s*\(\d+\)\s*$/, "").trim();
  if (plain) return plain;
  return String(slug).split("-").filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

// Age on 1 September of the season's first year, the date the archive uses.
export function ageAt(dob, year) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dob ?? "");
  if (!m) return null;
  const [by, bm, bd] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return year - by - ((bm > 9 || (bm === 9 && bd > 1)) ? 1 : 0);
}

// The last valuation before February of the season's second year: the value
// the player carried through the season, not the one it ended with.
export function valueAt(history, year) {
  if (!history?.length) return null;
  const cut = `${year + 1}-02-01`;
  const before = history.filter(([d, v]) => d <= cut && v > 0);
  if (before.length) return before.at(-1)[1];
  return history.find(([, v]) => v > 0)?.[1] ?? null;
}

const score = (value, age) => Math.log(Math.max(1, value)) - ageValuePremium(age);

// A season's top-flight scores define its rating curve (the archive's own:
// rank within the season, 38 + 58 × pct^0.45). A Championship player is
// placed on that same curve, so a club that goes up meets the gap it would
// in life; below the top flight's cheapest player the curve carries on as
// the straight line fitted to its bottom quarter.
export function topFlightCurve(scores) {
  const sorted = [...scores].sort((a, b) => a - b);
  const n = sorted.length;
  const ovAt = (i) => OV_RANGE[0] + (OV_RANGE[1] - OV_RANGE[0]) * (i / (n - 1)) ** OV_CURVE;
  const q = Math.max(2, Math.floor(n / 4));
  const xs = sorted.slice(0, q), ys = xs.map((_, i) => ovAt(i));
  const mx = xs.reduce((a, b) => a + b, 0) / q, my = ys.reduce((a, b) => a + b, 0) / q;
  const slope = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  return (s) => {
    if (s >= sorted[n - 1]) return OV_RANGE[1];
    if (s < sorted[0]) return Math.max(30, ovAt(0) - slope * (sorted[0] - s));
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (sorted[mid] <= s) lo = mid; else hi = mid; }
    const t = sorted[hi] > sorted[lo] ? (s - sorted[lo]) / (sorted[hi] - sorted[lo]) : 0;
    return ovAt(lo) + t * (ovAt(hi) - ovAt(lo));
  };
}

// Maps each score onto a reference set of overalls by rank: used for a
// season the snapshot caught only part of.
export function quantileMap(scores, referenceOvs) {
  const ref = [...referenceOvs].sort((a, b) => a - b);
  const order = scores.map((s, i) => [s, i]).sort((a, b) => a[0] - b[0]);
  const out = new Array(scores.length);
  order.forEach(([, i], rank) => {
    const pct = order.length > 1 ? rank / (order.length - 1) : 1;
    out[i] = ref[Math.round(pct * (ref.length - 1))];
  });
  return out;
}

export async function loadDatalake(dir) {
  const wanted = new Map([[TOP, new Set([...CHAMPIONSHIP_YEARS, NEW_TOP_SEASON])], [SECOND, new Set(CHAMPIONSHIP_YEARS)]]);
  const byName = new Map([...new Set([...CHAMPIONSHIP_YEARS, NEW_TOP_SEASON])].map((y) => [seasonName(y), y]));
  const apps = new Map(); // `${comp}|${year}` → Map(pid → { team, minutes })
  await eachRow(join(dir, "player_performances.csv"), (r) => {
    const year = byName.get(r.season_name);
    if (year == null || !wanted.get(r.competition_id)?.has(year)) return;
    if (!(Number(r.nb_on_pitch) > 0)) return;
    const key = `${r.competition_id}|${year}`;
    if (!apps.has(key)) apps.set(key, new Map());
    const minutes = Number(r.minutes_played) || 0;
    const prev = apps.get(key).get(r.player_id);
    if (!prev || minutes > prev.minutes) apps.get(key).set(r.player_id, { team: r.team_name, minutes });
  });
  const need = new Set([...apps.values()].flatMap((m) => [...m.keys()]));
  const values = new Map();
  await eachRow(join(dir, "player_market_value.csv"), (r) => {
    if (!need.has(r.player_id)) return;
    if (!values.has(r.player_id)) values.set(r.player_id, []);
    values.get(r.player_id).push([r.date_unix, Number(r.value) || 0]);
  });
  for (const v of values.values()) v.sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const profiles = new Map();
  await eachRow(join(dir, "player_profiles.csv"), (r) => {
    if (need.has(r.player_id)) profiles.set(r.player_id, { name: r.player_name, slug: r.player_slug, dob: r.date_of_birth, nat: r.citizenship.split(/\s{2,}/)[0].trim(), position: r.position });
  });
  return { apps, values, profiles };
}

// Everyone who played in a competition-season, by club, most-used first,
// with a score for rating.
function seasonRows(lake, comp, year) {
  const clubs = new Map();
  for (const [pid, a] of lake.apps.get(`${comp}|${year}`) ?? []) {
    const p = lake.profiles.get(pid);
    const value = valueAt(lake.values.get(pid), year);
    if (!p || !value) continue;
    if (!clubs.has(a.team)) clubs.set(a.team, []);
    const [slot, side] = slotFor(p.position);
    const age = ageAt(p.dob, year);
    clubs.get(a.team).push({ pid, minutes: a.minutes, name: plainPlayerName(p.name, p.slug), slot, side, age, nat: p.nat || "Unknown", score: score(value, age) });
  }
  for (const rows of clubs.values()) rows.sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name));
  return clubs;
}

// One competition-season's squads: each club's most-used players, at least
// two keepers.
function squadsFor(lake, comp, year) {
  const out = new Map();
  for (const [team, rows] of seasonRows(lake, comp, year)) {
    const squad = rows.slice(0, SQUAD_CAP);
    for (const gk of rows.slice(SQUAD_CAP).filter((r) => r.slot === "GK")) {
      if (squad.filter((r) => r.slot === "GK").length >= 2) break;
      squad.push(gk);
    }
    out.set(team, squad);
  }
  return out;
}

function toRows(key, squad, ovs) {
  return squad.map((r, i) => {
    const ov = Math.round(ovs[i]);
    const stats = statsFromOv(r.slot, ov, createRng(hashSeed(`${key}|${r.name}|${r.slot}`)));
    return [r.name, r.slot, r.side, r.age, r.nat, ov, ...Object.values(stats)];
  });
}

// The ratings of each club's `perClub` most-used players, from a season's
// squads (sorted by minutes) and the ratings given to their flattened rows.
function regulars(squads, ovs, perClub) {
  const out = [];
  let at = 0;
  for (const squad of squads.values()) {
    out.push(...ovs.slice(at, at + Math.min(perClub, squad.length)));
    at += squad.length;
  }
  return out.map(Math.round);
}

function medianSize(squads) {
  const sizes = [...squads.values()].map((s) => s.length).sort((a, b) => a - b);
  return sizes[Math.floor(sizes.length / 2)];
}

// A club's slug and name: the archive's when it has the club already, so a
// club is one club across both archives.
function clubKey(team, clubs, colours) {
  const slug = slugFor(team);
  if (clubs[slug]) return [slug, clubs[slug]];
  return [slug, colours[slug]?.name ?? team];
}

// Names recovered from a slug lose their punctuation (O'Brien → Obrien);
// where the archive knows a player whose name gives the same slug, use its
// spelling so he is recognised as the same person.
function respell(lake, players) {
  const known = new Map();
  for (const rows of Object.values(players.squads)) for (const r of rows) known.set(slugFor(r[0]), r[0]);
  for (const p of lake.profiles.values()) {
    if (!String(p.name).replace(/\s*\(\d+\)\s*$/, "").trim() && known.has(p.slug)) p.name = known.get(p.slug);
  }
}

// A season's rating scale. Everyone who played in the top flight is ranked
// on the archive's curve (the original pipeline ranked the whole league,
// then trimmed squads), and that is mapped onto the shipped squads' own
// numbers by the straight line fitted to the players both have: r² 0.76 to
// 0.91, the shipped ratings having come from the same kind of values. A
// Championship player is placed on the same scale, below the top flight's
// cheapest player where he belongs.
export function seasonScale(lake, players, year) {
  const rows = [...seasonRows(lake, TOP, year)].flatMap(([team, list]) => list.map((r) => ({ ...r, club: slugFor(team) })));
  const curve = topFlightCurve(rows.map((r) => r.score));
  const pairs = [];
  for (const r of rows) {
    const hit = players.squads[`${year}_${r.club}`]?.find((x) => x[0] === r.name);
    if (hit) pairs.push([curve(r.score), hit[5]]);
  }
  const n = pairs.length;
  const mx = pairs.reduce((t, q) => t + q[0], 0) / n, my = pairs.reduce((t, q) => t + q[1], 0) / n;
  const a = pairs.reduce((t, q) => t + (q[0] - mx) * (q[1] - my), 0) / pairs.reduce((t, q) => t + (q[0] - mx) ** 2, 0);
  const b = my - a * mx;
  return { rate: (score) => Math.min(OV_RANGE[1], Math.max(30, a * curve(score) + b)), a, b, matched: n };
}

export function buildFromLake(lake, players, colours) {
  respell(lake, players);
  const clubs = { ...players.clubs };
  const squads = { ...players.squads };
  const index = players.index.filter((e) => Number(e.y) < NEW_TOP_SEASON);

  // The newest top-flight season, rated the archive's way: by rank within it.
  // The snapshot caught 2025-26 early, when each club had used only its
  // regulars: ranked alone, the big clubs' players rise and the small clubs'
  // fall for want of fringe players beneath them. So 2025-26 is ranked onto
  // what 2024-25's regulars (the same number per club) were rated.
  const top = squadsFor(lake, TOP, NEW_TOP_SEASON);
  const topRows = [...top.values()].flat();
  const prevTop = squadsFor(lake, TOP, NEW_TOP_SEASON - 1);
  const prevScale = seasonScale(lake, players, NEW_TOP_SEASON - 1);
  const prevTopOvs = [...prevTop.values()].flat().map((r) => prevScale.rate(r.score));
  const topOvs = quantileMap(topRows.map((r) => r.score), regulars(prevTop, prevTopOvs, medianSize(top)));
  const topSlugs = [];
  for (const [team, squad] of [...top].sort((a, b) => a[0].localeCompare(b[0]))) {
    const [slug, name] = clubKey(team, clubs, colours);
    clubs[slug] = name;
    const key = `${NEW_TOP_SEASON}_${slug}`;
    const offset = topRows.indexOf(squad[0]);
    squads[key] = toRows(key, squad, topOvs.slice(offset, offset + squad.length));
    index.push({ y: String(NEW_TOP_SEASON), c: slug, label: `${name} ${seasonLabel(NEW_TOP_SEASON)}` });
    topSlugs.push(slug);
  }

  // The Championship. Each full season is first placed on its own
  // top-flight scale, which sets where the division sits below the top
  // flight; but that line is extrapolated below the top flight's cheapest
  // player, and how steeply depends on the season's fit (2024-25's put its
  // Championship ten points below every other season's, and 2025-26, ranked
  // onto it, with it). So, as the archive does for the top flight, every
  // season then takes one shared distribution by rank within the season:
  // all the full seasons' ratings pooled. 2025-26, a snapshot of regulars,
  // is ranked onto the pooled regulars, the same number per club.
  const champ = new Map(CHAMPIONSHIP_YEARS.map((year) => [year, squadsFor(lake, SECOND, year)]));
  const full = CHAMPIONSHIP_YEARS.filter((year) => year !== NEW_TOP_SEASON);
  const placed = new Map(full.map((year) => {
    const { rate } = seasonScale(lake, players, year);
    return [year, [...champ.get(year).values()].flat().map((r) => rate(r.score))];
  }));
  const pooled = full.flatMap((year) => placed.get(year));
  const newest = champ.get(NEW_TOP_SEASON);
  const pooledRegulars = full.flatMap((year) => regulars(champ.get(year), placed.get(year), medianSize(newest)));
  const champSquads = {};
  const champIndex = [];
  for (const year of CHAMPIONSHIP_YEARS) {
    const season = champ.get(year);
    const rows = [...season.values()].flat();
    const ovs = quantileMap(rows.map((r) => r.score), year === NEW_TOP_SEASON ? pooledRegulars : pooled);
    for (const [team, squad] of [...season].sort((a, b) => a[0].localeCompare(b[0]))) {
      const [slug, name] = clubKey(team, clubs, colours);
      clubs[slug] = name;
      const key = `${year}_${slug}`;
      const offset = rows.indexOf(squad[0]);
      champSquads[key] = toRows(key, squad, ovs.slice(offset, offset + squad.length));
      champIndex.push({ y: String(year), c: slug, label: `${name} ${seasonLabel(year)}` });
    }
  }
  return { clubs, squads, index, topSlugs, champSquads, champIndex };
}

async function main() {
  const args = process.argv.slice(2);
  const dir = args.find((a) => !a.startsWith("--"));
  if (!dir) { console.error("usage: node scripts/import-transfermarkt.mjs <datalake csv dir> [--out src/data]"); process.exit(2); }
  const outIndex = args.indexOf("--out");
  const outDir = outIndex >= 0 ? args[outIndex + 1] : "src/data";
  const players = JSON.parse(readFileSync("src/data/players.json", "utf8"));
  const colours = JSON.parse(readFileSync("src/content/clubColours.json", "utf8"));
  const lake = await loadDatalake(dir);
  const built = buildFromLake(lake, players, colours);
  const place = (clubs) => clubs[TOP_FLIGHT_PLACE];
  const { premier, championship, reserve } = buildDivisions(built.squads, built.champSquads, built.clubs, built.topSlugs, NEW_TOP_SEASON, place(built.clubs));
  const opponents = premier.filter((o) => o.name !== place(built.clubs));
  const champPlace = championship.at(-1).name;
  const topClubs = Object.fromEntries(Object.entries(built.clubs).filter(([slug]) => built.index.some((e) => e.c === slug)));
  const champClubs = Object.fromEntries(Object.entries(built.clubs).filter(([slug]) => built.champIndex.some((e) => e.c === slug)));
  writeFileSync(join(outDir, "players.json"), JSON.stringify({ clubs: topClubs, squads: built.squads, index: built.index, opponents, premier, place: place(built.clubs) }) + "\n");
  writeFileSync(join(outDir, "championship.json"), JSON.stringify({ clubs: champClubs, squads: built.champSquads, index: built.champIndex, table: championship, reserve, place: champPlace }) + "\n");
  console.log(`top flight: ${built.index.length} club-seasons (${Object.keys(built.squads).filter((k) => k.startsWith(`${NEW_TOP_SEASON}_`)).length} in ${seasonLabel(NEW_TOP_SEASON)}), ${opponents.length} rivals, ${premier.length} clubs`);
  console.log(`championship: ${built.champIndex.length} club-seasons, ${championship.length} clubs in ${seasonLabel(NEW_TOP_SEASON)}, ${reserve.length} in reserve; a Championship career takes ${champPlace}'s place`);
}

if (process.argv[1]?.endsWith("import-transfermarkt.mjs")) main();
