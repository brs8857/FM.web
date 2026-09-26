// Balance report: how often each style wins the title or finishes bottom three.
// Usage: npm run sim                   (400 seasons per cell)
//        npm run sim -- 50             (quicker)
//        npm run sim -- 1000 --assert  (exit 1 unless every cell is inside the thresholds; CI)
//        npm run sim -- --markdown     (the table as Markdown, for a commit message)
//        npm run sim -- --profiles     (also print the mean team profile per cell)
import { readFileSync } from "node:fs";
import { createRng } from "../src/engine/rng.js";
import { createSquadLookup, buildPool } from "../src/engine/players.js";
import { makeInitialAssignments } from "../src/engine/formations.js";
import { defaultRoleFor, defaultDutyFor } from "../src/engine/roles.js";
import { STYLE_PRESETS } from "../src/engine/instructions.js";
import { computeFamiliarity } from "../src/engine/familiarity.js";
import { computeTeamProfile } from "../src/engine/tactics.js";
import { simulateSeason } from "../src/engine/season.js";

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

export function markdownTable(rows) {
  const header = "| Formation | Draft | Style | Avg pts | Title % | Bottom 3 % |\n|---|---|---|---|---|---|";
  return [header, ...rows.map((r) => `| ${r.formation} | ${r.strategy} | ${r.style} | ${r.avgPts} | ${r.titlePct} | ${r.bottom3Pct} |`)].join("\n");
}

if (process.argv[1]?.endsWith("sim.mjs")) {
  const args = process.argv.slice(2);
  const runs = Number(args.find((a) => /^\d+$/.test(a)) ?? 400);
  const dataset = JSON.parse(readFileSync("src/data/players.json", "utf8"));
  const rows = runBalance(dataset, runs, { profiles: args.includes("--profiles") });
  if (args.includes("--markdown")) console.log(markdownTable(rows));
  else console.table(rows);
  if (args.includes("--assert")) {
    const bad = violations(rows);
    if (bad.length) {
      console.error(`Balance thresholds failed (${runs} seasons per cell):\n${bad.join("\n")}`);
      process.exit(1);
    }
    console.log(`Balance thresholds met: best-pick title ${THRESHOLDS.title.join("-")}%, random-pick bottom three ${THRESHOLDS.bottomThree.join("-")}%.`);
  }
}
