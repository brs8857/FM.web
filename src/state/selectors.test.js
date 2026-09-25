// @vitest-environment node
import { describe, it, expect } from "vitest";
import { selectEraIndex, liveAssignments, selectNextAction, selectLegacyWheel, selectSeasonHistory } from "./selectors.js";
import { makeMiniDataset } from "../../tests/fixtures/miniDataset.js";
import { makeInitialState } from "./initialState.js";
import { CAREER_SEASONS } from "../engine/season.js";

describe("selectors", () => {
  it("filters the club-season index to the era", () => {
    const index = [{ y: "1999", c: "1" }, { y: "2000", c: "1" }, { y: "2011", c: "2" }, { y: "2012", c: "2" }];
    expect(selectEraIndex(index, 2000, 2011).map((e) => e.y)).toEqual(["2000", "2011"]);
  });

  it("turns role keys into role objects", () => {
    const live = liveAssignments([
      { type: "ST", role: "POA" },
      { type: "ST", role: null },
      { type: "ST", role: "NOPE" },
    ]);
    expect(live[0].role.label).toBe("Poacher");
    expect(live[1].role).toBeNull();
    expect(live[2].role).toBeNull();
  });
});

describe("compatibility and record selectors", () => {
  const player = { id: "p", name: "Tony Adams" };
  const option = { year: "2000", clubId: "1", label: "Alpha FC 2000-01", players: [player], relaxed: true };

  it("presents the first cutting as the legacy wheel", () => {
    const state = makeInitialState(makeMiniDataset(), 1);
    expect(selectLegacyWheel(state)).toEqual({ wheel: { spinning: false, landed: null }, pool: [], poolRelaxed: false });
    expect(selectLegacyWheel({ ...state, draw: { spinning: true, options: [], redrawsLeft: 2 } }).wheel.spinning).toBe(true);
    expect(selectLegacyWheel({ ...state, draw: { spinning: false, options: [option, { ...option, clubId: "2" }], redrawsLeft: 2 } }))
      .toEqual({ wheel: { spinning: false, landed: { year: "2000", clubId: "1", label: "Alpha FC 2000-01" } }, pool: [player], poolRelaxed: true });
  });

  it("adds the season on screen to the record until the window opens", () => {
    const state = makeInitialState(makeMiniDataset(), 1);
    const summarize = (s) => ({ season: s.season, pts: 70 });
    const history = [{ season: 1, pts: 60 }];
    expect(selectSeasonHistory({ ...state, seasonHistory: history, phase: "tactics", season: 2 }, summarize)).toBe(history);
    expect(selectSeasonHistory({ ...state, seasonHistory: history, phase: "result", season: 2, simulation: {} }, summarize)).toEqual([...history, { season: 2, pts: 70 }]);
    expect(selectSeasonHistory({ ...state, seasonHistory: history, phase: "result", season: 1, simulation: {} }, summarize)).toBe(history);
  });
});

describe("selectNextAction", () => {
  const base = () => makeInitialState(makeMiniDataset(), 1);
  const player = { id: "p", name: "Tony Adams" };

  it("names the next step for every phase", () => {
    const state = base();
    expect(selectNextAction(state)).toEqual({ key: "startDraft", label: "Start the draft", tab: null });

    const assignments = state.assignments.map((a, i) => (i < 4 ? { ...a, player } : a));
    expect(selectNextAction({ ...state, phase: "draft", assignments })).toMatchObject({ key: "draft", label: "Draft in progress: pick 5 of 11", tab: null, pick: 5, slotId: "RB" });
    expect(selectNextAction({ ...state, phase: "draft" })).toMatchObject({ label: "Draft in progress: pick 1 of 11", slotId: "GK" });
    expect(selectNextAction({ ...state, phase: "draft", draftDone: true })).toEqual({ key: "goToBoard", label: "Go to the board", tab: null });

    expect(selectNextAction({ ...state, phase: "tactics" })).toEqual({ key: "setTactic", label: "Set your tactic", tab: "board" });
    expect(selectNextAction({ ...state, phase: "tactics", selectedStyle: "gegenpress" })).toEqual({ key: "kickOff", label: "Kick off season 1", tab: "season" });
    expect(selectNextAction({ ...state, phase: "tactics", season: 3, instructions: { ...state.instructions, tempo: 70 } })).toEqual({ key: "kickOff", label: "Kick off season 3", tab: "season" });

    expect(selectNextAction({ ...state, phase: "reveal", season: 2 })).toEqual({ key: "startSeason", label: "Start season 2", tab: "season" });
    expect(selectNextAction({ ...state, phase: "result", season: 2 })).toEqual({ key: "openWindow", label: "Open the window", tab: "season" });
    expect(selectNextAction({ ...state, phase: "result", season: CAREER_SEASONS })).toEqual({ key: "careerComplete", label: "Career complete", tab: "club" });
    expect(selectNextAction({ ...state, phase: "transfer", season: 2 })).toEqual({ key: "closeWindow", label: "Close the window", tab: "season" });
  });
});
