import { makeInitialAssignments } from "../engine/formations.js";
import { DEFAULT_INSTRUCTIONS } from "../engine/instructions.js";
import { EMPTY_MEMORY } from "../engine/familiarity.js";
import { TOP, CHAMPIONSHIP } from "../engine/divisions.js";

export const DRAW_OPTIONS = 3; // club-seasons per draw (owner decision U1)
export const REDRAWS = 2; // for the XI, and again for the bench (owner decisions U2, G3)

// Each archive's seasons: the top flight's from 1992-93, the Championship's
// from 2016-17, when it took the name it has now.
export const ERAS = { [TOP]: { min: 1992, max: 2025 }, [CHAMPIONSHIP]: { min: 2016, max: 2025 } };

// Where a career starts: its rivals are the division less the club your XI
// replaces, and the other division is kept whole (spec 09 §6).
export function startingDivisions(dataset, league) {
  if (league === CHAMPIONSHIP) {
    return { opponents: dataset.championship.table.filter((c) => c.name !== dataset.championship.place), other: dataset.premier };
  }
  return { opponents: dataset.opponents, other: dataset.championship.table };
}

export function makeInitialState(dataset, careerSeed, league = TOP) {
  const { opponents, other } = startingDivisions(dataset, league);
  return {
    careerSeed,
    rngCounter: 0,
    phase: "formation", // formation | draft | tactics | reveal | matchday | result | transfer
    formationKey: "4-3-3",
    assignments: makeInitialAssignments("4-3-3"),
    bench: [], // { player, role, duty }, up to ten, drafted after the XI
    draftDone: false, // true once the XI and the bench are both drafted
    autoCover: true, // Play to… covers a suspended starter from the bench (spec 08 §6)
    covers: [], // { slotId, starterId, coverId } for bans covered this season
    draftedIds: new Set(),
    draftedIdentities: [],
    draw: { spinning: false, options: [], redrawsLeft: REDRAWS }, // options: { year, clubId, label, players, relaxed }[]
    instructions: { ...DEFAULT_INSTRUCTIONS },
    selectedStyle: null,
    cohesionMemory: { ...EMPTY_MEMORY }, // the system the last seasons were played in, and how many in a row
    eraMin: ERAS[league].min,
    eraMax: ERAS[league].max,
    league, // the division the career started in: its archive is the draft's, and the window's while you are in it
    division: league, // the division this season is played in: "top" | "championship"
    other: other, // the whole of the division you are not in
    reserve: dataset.championship.reserve, // real clubs below the Championship, standing in for League One
    playoffs: null, // the Championship play-offs you are in, from the last league match to the final
    simulation: null, // the finished season, from its last match through the window
    campaign: null, // the season in progress, from kick-off to the window: { seed, order, week, log }
    discipline: {}, // { [playerId]: { yellows, banned } }: the season's yellows and matches left to serve; cleared at the window
    season: 1, // 1 = 2026-27, up to 6 = 2031-32, then the career ends
    seasonHistory: [], // one summary per completed season, appended when the window opens
    shortlist: [], // { player, signed, cost }[] — the current window's eight candidates
    transferBudget: null, // { points, spent } wage points for the open window, set from last season's finish
    opponents, // the rivals in your division, 19 or 23; evolves each season via promotion/relegation
    lastTransition: null, // { relegated, promoted, wentUp?, cameDown?, userMove } from the season just gone
  };
}
