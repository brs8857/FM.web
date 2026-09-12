import { vi } from "vitest";
import { makeMiniDataset } from "./miniDataset.js";
import { playCareer } from "./playCareer.js";
import { createReducer } from "../../src/state/reducer.js";
import { makeInitialState } from "../../src/state/initialState.js";
import { makeSaveEnvelope, toSaveText } from "../../src/state/save.js";

export function makeSeason3TacticsState(seed = 4242) {
  const dataset = makeMiniDataset();
  const reducer = createReducer(dataset);
  let state = playCareer({ reducer, initialState: makeInitialState(dataset, seed), seasons: 2 });
  state = reducer(state, { type: "GOTO_TRANSFER" });
  return reducer(state, { type: "CONTINUE_SEASON" });
}

export function makeSaveText(state = makeSeason3TacticsState()) {
  return toSaveText(makeSaveEnvelope(state, { gameVersion: "1.1.0", now: new Date("2026-09-11T20:00:00.000Z") }));
}

export function fakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: vi.fn((key, value) => { data.set(key, String(value)); }),
    removeItem: (key) => { data.delete(key); },
  };
}
