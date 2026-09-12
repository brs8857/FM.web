// @vitest-environment node
import { describe, it, expect } from "vitest";
import { makeMiniDataset } from "../fixtures/miniDataset.js";
import { playCareer } from "../fixtures/playCareer.js";
import { createReducer } from "../../src/state/reducer.js";
import { makeInitialState } from "../../src/state/initialState.js";

export function checkInvariants(state, action, previous) {
  const label = action.type;
  expect(state.assignments, label).toHaveLength(11);
  expect(state.bench.length, label).toBeLessThanOrEqual(6);
  const ids = [...state.assignments, ...state.bench].map((e) => e.player?.id).filter(Boolean);
  expect(new Set(ids).size, label).toBe(ids.length);
  expect(state.opponents, label).toHaveLength(19);
  expect(state.rngCounter, label).toBeGreaterThanOrEqual(previous.rngCounter);
  expect(state.draftedIdentities, label).toHaveLength(state.draftedIds.size);
}

describe("reducer career walkthrough", () => {
  it("plays six seasons keeping squad and league invariants after every action", () => {
    const dataset = makeMiniDataset();
    const final = playCareer({
      reducer: createReducer(dataset),
      initialState: makeInitialState(dataset, 7),
      check: checkInvariants,
    });
    expect(final.season).toBe(6);
    expect(final.phase).toBe("result");
    expect(final.simulation.season).toBe(6);
    expect(final.simulation.matches).toHaveLength(38);
  });

  it("SET_FORMATION empties the squad but keeps the era", () => {
    const dataset = makeMiniDataset();
    const reducer = createReducer(dataset);
    let state = reducer(makeInitialState(dataset, 7), { type: "SET_ERA", min: 2000, max: 2005 });
    state = reducer(state, { type: "SET_FORMATION", key: "4-4-2" });
    expect(state.formationKey).toBe("4-4-2");
    expect(state.assignments.every((a) => a.player === null)).toBe(true);
    expect([state.eraMin, state.eraMax]).toEqual([2000, 2005]);
  });

  it("NEW_GAME starts over with the given seed", () => {
    const dataset = makeMiniDataset();
    const reducer = createReducer(dataset);
    const played = playCareer({ reducer, initialState: makeInitialState(dataset, 7), seasons: 1 });
    const fresh = reducer(played, { type: "NEW_GAME", seed: 99 });
    expect(fresh).toEqual(makeInitialState(dataset, 99));
  });

  it("flags a relaxed pool when the landed squad has no player for the slot", () => {
    const dataset = makeMiniDataset();
    const reducer = createReducer(dataset);
    let state = makeInitialState(dataset, 3);
    state = reducer(state, { type: "SET_FORMATION", key: "4-1-4-1" }); // slot 6 is the DM
    state = reducer(state, { type: "SET_ERA", min: 2005, max: 2005 }); // only Gamma Town 2005-06, which has no DM
    state = reducer(state, { type: "START_DRAFT" });
    for (let pick = 0; pick < 5; pick++) {
      state = reducer(reducer(state, { type: "SPIN" }), { type: "LAND" });
      expect(state.poolRelaxed).toBe(false);
      state = reducer(state, { type: "PICK_PLAYER", player: state.pool[0] });
    }
    state = reducer(reducer(state, { type: "SPIN" }), { type: "LAND" });
    expect(state.poolRelaxed).toBe(true);
    state = reducer(state, { type: "PICK_PLAYER", player: state.pool[0] });
    expect(state.poolRelaxed).toBe(false);
  });
});
