import { vi } from "vitest";
import { makeMiniDataset } from "./miniDataset.js";
import { playCareer, playMatches } from "./playCareer.js";
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
  return playMatches(reducer, reducer(reveal, { type: "KICKOFF" }), played);
}

// The same, with nobody on the bench, so a ban never stops play (the side
// goes a man short instead): runs of matches go where they are told.
export function makeSeason3OpenState(played, seed = 4242) {
  return { ...makeSeason3State(played, seed), bench: [], discipline: {} };
}

export function makeSeason3ResultState(seed = 4242) {
  return makeSeason3State(38, seed);
}

// Season 1 of a top-flight career on its back page, finished at `position`.
export function makeSeason1ResultAt(position, seed = 9) {
  const dataset = makeMiniDataset();
  const played = playCareer({ reducer: createReducer(dataset), initialState: makeInitialState(dataset, seed), seasons: 1 });
  const rows = played.simulation.table.filter((r) => !r.isUser);
  rows.splice(position - 1, 0, played.simulation.table.find((r) => r.isUser));
  return { ...played, simulation: { ...played.simulation, table: rows.map((r, i) => ({ ...r, position: i + 1 })), position } };
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
