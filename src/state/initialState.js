import { makeInitialAssignments } from "../engine/formations.js";
import { DEFAULT_INSTRUCTIONS } from "../engine/instructions.js";
import { EMPTY_MEMORY } from "../engine/familiarity.js";

export const DRAW_OPTIONS = 3; // club-seasons per draw (owner decision U1)
export const REDRAWS = 2; // for the XI, and again for the bench (owner decisions U2, G3)

export function makeInitialState(dataset, careerSeed) {
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
    eraMin: 1992,
    eraMax: 2024,
    simulation: null, // the finished season, from its last match through the window
    campaign: null, // the season in progress, from kick-off to the window: { seed, order, week, log }
    discipline: {}, // { [playerId]: { yellows, banned } }: the season's yellows and matches left to serve; cleared at the window
    season: 1, // 1 = 2026-27, up to 6 = 2031-32, then the career ends
    seasonHistory: [], // one summary per completed season, appended when the window opens
    shortlist: [], // { player, signed, cost }[] — the current window's eight candidates
    transferBudget: null, // { points, spent } wage points for the open window, set from last season's finish
    opponents: dataset.opponents, // evolves each season via promotion/relegation
    lastTransition: null, // { relegated: [names], promoted: [names] } from the season just gone
  };
}
