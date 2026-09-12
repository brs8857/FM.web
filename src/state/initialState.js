import { makeInitialAssignments } from "../engine/formations.js";
import { DEFAULT_INSTRUCTIONS } from "../engine/instructions.js";

export function makeInitialState(dataset, careerSeed) {
  return {
    careerSeed,
    rngCounter: 0,
    phase: "formation", // formation | draft | tactics | reveal | result | transfer
    formationKey: "4-3-3",
    assignments: makeInitialAssignments("4-3-3"),
    bench: [], // { player, role, duty } - auto-filled once starting XI is complete
    draftDone: false,
    draftedIds: new Set(),
    wheel: { spinning: false, landed: null },
    pool: [],
    instructions: { ...DEFAULT_INSTRUCTIONS },
    selectedStyle: null,
    eraMin: 1992,
    eraMax: 2024,
    simulation: null,
    season: 1, // 1 = 2026-27, up to 6 = 2031-32, then the career ends
    shortlist: [], // { player, signed }[] — current transfer window's 5 candidates
    opponents: dataset.opponents, // evolves each season via promotion/relegation
    lastTransition: null, // { relegated: [names], promoted: [names] } from the season just gone
  };
}
