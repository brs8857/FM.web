// Balance report: how often each style wins the title or finishes bottom three.
// Usage: npm run sim            (400 seasons per cell)
//        npm run sim -- 50      (quicker)
import { readFileSync } from "node:fs";
import { createRng } from "../src/engine/rng.js";
import { createSquadLookup, buildPool } from "../src/engine/players.js";
import { makeInitialAssignments } from "../src/engine/formations.js";
import { defaultRoleFor, defaultDutyFor } from "../src/engine/roles.js";
import { STYLE_PRESETS } from "../src/engine/instructions.js";
import { computeFamiliarity } from "../src/engine/familiarity.js";
import { computeTeamProfile } from "../src/engine/tactics.js";
import { simulateSeason } from "../src/engine/season.js";

const RUNS = Number(process.argv[2] ?? 400);
const dataset = JSON.parse(readFileSync("src/data/players.json", "utf8"));
const getSquad = createSquadLookup(dataset);

function draft(formationKey, strategy, rng) {
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

const rows = [];
let seed = 1;
for (const formationKey of ["4-3-3", "4-2-3-1"]) {
  for (const strategy of ["best", "random"]) {
    for (const style of STYLE_PRESETS) {
      let points = 0, titles = 0, bottomThree = 0;
      for (let run = 0; run < RUNS; run++) {
        const rng = createRng(seed++);
        const xi = draft(formationKey, strategy, rng);
        const familiarity = computeFamiliarity(xi, style.instructions, formationKey);
        const profile = computeTeamProfile(xi, style.instructions, familiarity);
        const season = simulateSeason(profile, familiarity, dataset.opponents, rng);
        points += season.pts;
        if (season.position === 1) titles++;
        if (season.position >= 18) bottomThree++;
      }
      rows.push({
        formation: formationKey, strategy, style: style.key,
        avgPts: (points / RUNS).toFixed(1),
        titlePct: Math.round((100 * titles) / RUNS),
        bottom3Pct: Math.round((100 * bottomThree) / RUNS),
      });
    }
  }
}
console.table(rows);
