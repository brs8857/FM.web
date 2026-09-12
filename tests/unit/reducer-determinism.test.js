// @vitest-environment node
import { describe, it, expect } from "vitest";
import { makeMiniDataset } from "../fixtures/miniDataset.js";
import { playCareer } from "../fixtures/playCareer.js";
import { createReducer } from "../../src/state/reducer.js";
import { makeInitialState } from "../../src/state/initialState.js";

function run(seed) {
  const dataset = makeMiniDataset();
  return playCareer({ reducer: createReducer(dataset), initialState: makeInitialState(dataset, seed) });
}

describe("reducer determinism", () => {
  it("replays an identical six-season career from the same seed", () => {
    expect(run(2024)).toEqual(run(2024));
  });

  it("produces a different career from a different seed", () => {
    expect(run(1).simulation.matches).not.toEqual(run(2).simulation.matches);
  });
});
