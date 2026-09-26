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

// Season 3 after kick-off: at the reveal, on match day `played` fixtures in,
// and on the back page.
export function makeSeason3State(played = null, seed = 4242) {
  const reducer = createReducer(makeMiniDataset());
  const reveal = reducer(makeSeason3TacticsState(seed), { type: "START_SEASON" });
  if (played === null) return reveal;
  let state = reducer(reveal, { type: "KICKOFF" });
  for (let i = 0; i < played; i++) state = reducer(state, { type: "PLAY_MATCH" });
  return state;
}

export function makeSeason3ResultState(seed = 4242) {
  return makeSeason3State(38, seed);
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
