// Balance report: how often each style wins the title or finishes bottom three.
// Usage: npm run sim                   (400 seasons per cell)
//        npm run sim -- 50             (quicker)
//        npm run sim -- 4000 --assert  (exit 1 unless every cell is inside the thresholds; CI. 4000
//                                       seasons put a cell's sampling error near half a point, where
//                                       1000 left it near one, and cells sit that close to a threshold)
//        npm run sim -- --markdown     (the table as Markdown, for a commit message)
//        npm run sim -- --profiles     (also print the mean team profile per cell)
//        npm run sim -- --settling     (only the settling table)
//        npm run sim -- --bans         (only the bans table)
import { readFileSync } from "node:fs";
import { createRng } from "../src/engine/rng.js";
import { createSquadLookup, buildPool } from "../src/engine/players.js";
import { makeInitialAssignments } from "../src/engine/formations.js";
import { defaultRoleFor, defaultDutyFor } from "../src/engine/roles.js";
import { STYLE_PRESETS } from "../src/engine/instructions.js";
import { computeFamiliarity, settling, afterMatch, EMPTY_MEMORY } from "../src/engine/familiarity.js";
import { computeTeamProfile } from "../src/engine/tactics.js";
import { simulateSeason, playSeason } from "../src/engine/season.js";
import { rivalStrength, matchEvents, nextDiscipline } from "../src/engine/match.js";
import { SEASON_WEEKS } from "../src/engine/season.js";

// Plan C5: no style may be a solved answer (best-pick title odds) and every
// style must carry some risk with an ordinary squad (random-pick bottom three).
export const THRESHOLDS = { title: [12, 45], bottomThree: [3, 12] };
export const FORMATIONS = ["4-3-3", "4-2-3-1"];
export const STRATEGIES = ["best", "random"];

export function draft(dataset, getSquad, formationKey, strategy, rng) {
  const drafted = new Set();
  return makeInitialAssignments(formationKey).map((slot) => {
    let players = [];
    while (players.length === 0) {
      const entry = rng.pick(dataset.index);
      players = buildPool(getSquad, entry.y, entry.c, slot.type, slot.side, drafted).players;
    }
    const player = strategy === "best" ? players[0] : rng.pick(players);
    drafted.add(player.id);
    const role = defaultRoleFor(slot.type);
    return { ...slot, player, role, duty: defaultDutyFor(role) };
  });
}

export function runBalance(dataset, runs, { profiles = false } = {}) {
  const getSquad = createSquadLookup(dataset);
  const rows = [];
  let seed = 1;
  for (const formation of FORMATIONS) {
    for (const strategy of STRATEGIES) {
      for (const style of STYLE_PRESETS) {
        let points = 0, titles = 0, bottomThree = 0;
        const mean = { attack: 0, defSolidity: 0, creativity: 0, familiarity: 0, avgOv: 0 };
        for (let run = 0; run < runs; run++) {
          const rng = createRng(seed++);
          const xi = draft(dataset, getSquad, formation, strategy, rng);
          const familiarity = computeFamiliarity(xi, style.instructions, formation);
          const profile = computeTeamProfile(xi, style.instructions, familiarity);
          const season = simulateSeason(profile, familiarity, dataset.opponents, rng);
          points += season.pts;
          if (season.position === 1) titles++;
          if (season.position >= 18) bottomThree++;
          if (profiles) {
            mean.attack += profile.attack; mean.defSolidity += profile.defSolidity; mean.creativity += profile.creativity;
            mean.familiarity += familiarity; mean.avgOv += profile.avgOv;
          }
        }
        const row = {
          formation, strategy, style: style.key,
          avgPts: Number((points / runs).toFixed(1)),
          titlePct: Number(((100 * titles) / runs).toFixed(1)),
          bottom3Pct: Number(((100 * bottomThree) / runs).toFixed(1)),
        };
        if (profiles) for (const k of Object.keys(mean)) row[k] = Number((mean[k] / runs).toFixed(1));
        rows.push(row);
      }
    }
  }
  return rows;
}

export function violations(rows, thresholds = THRESHOLDS) {
  const out = [];
  for (const row of rows) {
    const cell = `${row.formation} ${row.strategy} ${row.style}`;
    if (row.strategy === "best" && (row.titlePct < thresholds.title[0] || row.titlePct > thresholds.title[1])) {
      out.push(`${cell}: title ${row.titlePct}% outside ${thresholds.title.join("-")}%`);
    }
    if (row.strategy === "random" && (row.bottom3Pct < thresholds.bottomThree[0] || row.bottom3Pct > thresholds.bottomThree[1])) {
      out.push(`${cell}: bottom three ${row.bottom3Pct}% outside ${thresholds.bottomThree.join("-")}%`);
    }
  }
  return out;
}

// Spec 07 §10.1: settling must make week-to-week re-optimisation a trade-off,
// not free points. The same XI plays the same season (order and seed) four
// ways: the batch with no settling (the cells above), keeping one system with
// settling (the real game for a player who never touches the board), changing
// the style every week, and sitting 25 deeper on mentality against the
// strongest third of the league (the lean spec 07 §3.2 says pays best, before
// settling). Neither changing strategy may out-point keeping the system.
export const SETTLING_STRATEGIES = ["batch", "keep", "weekly", "lean"];

function lineups(xi, formation, instructionsFor) {
  let memory = EMPTY_MEMORY;
  return (fixture) => {
    const instructions = instructionsFor(fixture);
    const settle = settling(memory, formation, instructions);
    const familiarity = computeFamiliarity(xi, instructions, formation, memory);
    memory = afterMatch(memory, settle);
    return { profile: computeTeamProfile(xi, instructions, familiarity), familiarity };
  };
}

export function runSettling(dataset, runs) {
  const getSquad = createSquadLookup(dataset);
  const opponents = dataset.opponents;
  const ranked = [...opponents].sort((a, b) => rivalStrength(b) - rivalStrength(a)).map((o) => o.name);
  const third = Math.round(ranked.length / 3);
  const rows = [];
  let seed = 1_000_000;
  for (const formation of FORMATIONS) {
    for (const strategy of STRATEGIES) {
      const tally = Object.fromEntries(SETTLING_STRATEGIES.map((k) => [k, { points: 0, titles: 0, bottomThree: 0 }]));
      for (let run = 0; run < runs; run++) {
        const rng = createRng(seed++);
        const xi = draft(dataset, getSquad, formation, strategy, rng);
        const base = STYLE_PRESETS[run % STYLE_PRESETS.length];
        const order = rng.shuffle(opponents).map((o) => o.name);
        const seasonSeed = rng.int(2 ** 32);
        const familiarity = computeFamiliarity(xi, base.instructions, formation);
        const batchLineup = { profile: computeTeamProfile(xi, base.instructions, familiarity), familiarity };
        const lean = (fixture) => {
          const at = ranked.indexOf(fixture.name);
          const mentality = at < third ? Math.max(0, base.instructions.mentality - 25) : base.instructions.mentality;
          return { ...base.instructions, mentality };
        };
        const seasons = {
          batch: playSeason(() => batchLineup, opponents, order, seasonSeed),
          keep: playSeason(lineups(xi, formation, () => base.instructions), opponents, order, seasonSeed),
          weekly: playSeason(lineups(xi, formation, (f) => STYLE_PRESETS[(run + f.week) % STYLE_PRESETS.length].instructions), opponents, order, seasonSeed),
          lean: playSeason(lineups(xi, formation, lean), opponents, order, seasonSeed),
        };
        for (const [k, s] of Object.entries(seasons)) {
          tally[k].points += s.pts;
          if (s.position === 1) tally[k].titles++;
          if (s.position >= 18) tally[k].bottomThree++;
        }
      }
      for (const k of SETTLING_STRATEGIES) {
        rows.push({
          formation, draft: strategy, play: k,
          avgPts: Number((tally[k].points / runs).toFixed(1)),
          titlePct: Number(((100 * tally[k].titles) / runs).toFixed(1)),
          bottom3Pct: Number(((100 * tally[k].bottomThree) / runs).toFixed(1)),
        });
      }
    }
  }
  return rows;
}

export function settlingViolations(rows) {
  const out = [];
  for (const row of rows.filter((r) => r.play === "weekly" || r.play === "lean")) {
    const keep = rows.find((r) => r.formation === row.formation && r.draft === row.draft && r.play === "keep");
    if (row.avgPts > keep.avgPts) out.push(`${row.formation} ${row.draft}: ${row.play} ${row.avgPts} pts out-points keeping the system (${keep.avgPts})`);
  }
  return out;
}

// Spec 08 §3: bans a season under the league's rule, a banned starter left
// out of the match he misses. Only the default Tackling is asserted; the
// other two show what the dial costs.
export const BAN_RANGE = [4, 7];
export const BAN_TACKLING = [20, 50, 80];

export function runBans(dataset, runs) {
  const getSquad = createSquadLookup(dataset);
  return BAN_TACKLING.map((tackling) => {
    const seasons = [];
    let missed = 0;
    for (let run = 0; run < runs; run++) {
      const xi = draft(dataset, getSquad, "4-3-3", "random", createRng(9000 + run));
      const rng = createRng(19000 + run);
      let discipline = {}, bans = 0;
      for (let week = 1; week <= SEASON_WEEKS; week++) {
        const on = xi.filter((a) => !(discipline[a.player.id]?.banned > 0));
        missed += xi.length - on.length;
        const next = nextDiscipline(discipline, matchEvents({ gf: 0, ga: 0 }, on, rng, { tackling }).cards, week);
        discipline = next.discipline;
        bans += next.bans.length;
      }
      seasons.push(bans);
    }
    seasons.sort((a, b) => a - b);
    const mean = seasons.reduce((a, b) => a + b, 0) / runs;
    return { tackling, bansPerSeason: Math.round(mean * 100) / 100, p90: seasons[Math.floor(runs * 0.9)], worst: seasons.at(-1), missedPerSeason: Math.round((missed / runs) * 100) / 100 };
  });
}

export function banViolations(rows) {
  const row = rows.find((r) => r.tackling === 50);
  return row.bansPerSeason >= BAN_RANGE[0] && row.bansPerSeason <= BAN_RANGE[1] ? [] : [`bans a season at default Tackling: ${row.bansPerSeason}, outside ${BAN_RANGE.join("-")}`];
}

export function markdownTable(rows) {
  const header = "| Formation | Draft | Style | Avg pts | Title % | Bottom 3 % |\n|---|---|---|---|---|---|";
  return [header, ...rows.map((r) => `| ${r.formation} | ${r.strategy} | ${r.style} | ${r.avgPts} | ${r.titlePct} | ${r.bottom3Pct} |`)].join("\n");
}

if (process.argv[1]?.endsWith("sim.mjs")) {
  const args = process.argv.slice(2);
  const runs = Number(args.find((a) => /^\d+$/.test(a)) ?? 400);
  const dataset = JSON.parse(readFileSync("src/data/players.json", "utf8"));
  const settlingOnly = args.includes("--settling");
  const bansOnly = args.includes("--bans");
  const banRows = runBans(dataset, runs);
  if (bansOnly) {
    console.table(banRows);
    const bad = banViolations(banRows);
    if (args.includes("--assert") && bad.length) { console.error(bad.join("\n")); process.exit(1); }
    process.exit(0);
  }
  const rows = settlingOnly ? [] : runBalance(dataset, runs, { profiles: args.includes("--profiles") });
  if (!settlingOnly) {
    if (args.includes("--markdown")) console.log(markdownTable(rows));
    else console.table(rows);
  }
  const settlingRows = runSettling(dataset, Math.max(1, Math.round(runs / 2)));
  if (args.includes("--markdown")) {
    console.log(["", "| Formation | Draft | Play | Avg pts | Title % | Bottom 3 % |", "|---|---|---|---|---|---|",
      ...settlingRows.map((r) => `| ${r.formation} | ${r.draft} | ${r.play} | ${r.avgPts} | ${r.titlePct} | ${r.bottom3Pct} |`)].join("\n"));
  } else console.table(settlingRows);
  console.table(banRows);
  if (args.includes("--assert")) {
    const bad = [...violations(rows), ...settlingViolations(settlingRows), ...banViolations(banRows)];
    if (bad.length) {
      console.error(`Balance thresholds failed (${runs} seasons per cell):\n${bad.join("\n")}`);
      process.exit(1);
    }
    console.log(`Balance thresholds met: best-pick title ${THRESHOLDS.title.join("-")}%, random-pick bottom three ${THRESHOLDS.bottomThree.join("-")}%; no weekly change out-points keeping the system; bans a season at default Tackling ${BAN_RANGE.join("-")}.`);
  }
}
