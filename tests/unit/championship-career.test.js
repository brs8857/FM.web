// @vitest-environment node
import { describe, it, expect } from "vitest";
import { makeMiniDataset } from "../fixtures/miniDataset.js";
import { playCareer, playPlayoffs, driver } from "../fixtures/playCareer.js";
import { createReducer, startPlayoffs, summarizeSeason } from "../../src/state/reducer.js";
import { makeInitialState, ERAS } from "../../src/state/initialState.js";
import { selectNextAction, selectPlayoffFixture } from "../../src/state/selectors.js";
import { makeSaveEnvelope, toSaveText, parseSaveText, hydrateState, serializeState } from "../../src/state/save.js";
import { USER_TEAM, USER_TEAM_NAME } from "../../src/engine/season.js";

const dataset = makeMiniDataset();
const reducer = createReducer(dataset);
const champStart = (seed = 7) => makeInitialState(dataset, seed, "championship");

// The table as it stood, with the user moved to `position`.
function userAt(table, position) {
  const rivals = table.filter((r) => !r.isUser);
  const user = table.find((r) => r.isUser);
  const rows = [...rivals];
  rows.splice(position - 1, 0, user);
  return rows.map((r, i) => ({ ...r, position: i + 1 }));
}

describe("a Championship career", () => {
  it("starts in the Championship with 23 real rivals and the top flight kept whole", () => {
    const s = champStart();
    expect(s).toMatchObject({ league: "championship", division: "championship", eraMin: ERAS.championship.min, eraMax: ERAS.championship.max });
    expect(s.opponents).toHaveLength(23);
    expect(s.opponents.map((o) => o.name)).not.toContain(dataset.championship.place);
    expect(s.other).toHaveLength(20);
    expect(reducer(makeInitialState(dataset, 7), { type: "SET_LEAGUE", league: "championship" })).toMatchObject({ league: "championship", division: "championship", eraMin: 2016 });
    expect(reducer({ ...s, phase: "draft" }, { type: "SET_LEAGUE", league: "top" })).toMatchObject({ league: "championship" });
  });

  it("drafts only from the Championship archive and plays 46 weeks", () => {
    const state = playCareer({ reducer, initialState: champStart(), seasons: 1 });
    for (const a of state.assignments) expect(["5", "6"]).toContain(a.player.seasonKey.split("_")[1]);
    expect(state.simulation.matches).toHaveLength(46);
    expect(state.simulation.table).toHaveLength(24);
    expect(["Championship winners", "Automatic promotion", "Play-offs", "Play-off winners", "Play-off final", "Play-off semi-final", "Championship mid-table", "Championship relegation zone"]).toContain(state.simulation.tier.name);
  });

  it("goes up from the top two and plays the next season in the top flight", () => {
    const played = playCareer({ reducer, initialState: champStart(3), seasons: 1 });
    const first = { ...played, simulation: { ...played.simulation, table: userAt(played.simulation.table, 1), position: 1 }, playoffs: null };
    const window = reducer(first, { type: "GOTO_TRANSFER" });
    expect(window.division).toBe("top");
    expect(window.lastTransition).toMatchObject({ userMove: "up", division: "top" });
    expect(window.lastTransition.wentUp[0]).toBe(USER_TEAM_NAME);
    expect(window.opponents).toHaveLength(19);
    expect(window.other).toHaveLength(24);
    expect(window.seasonHistory.at(-1)).toMatchObject({ division: "championship" });
    // The window signs from the top-flight archive now.
    for (const e of window.shortlist) expect(["1", "2", "3", "4"]).toContain(e.player.seasonKey.split("_")[1]);
    const next = reducer(reducer(window, { type: "CONTINUE_SEASON" }), { type: "START_SEASON" });
    expect(next.campaign.order).toHaveLength(19);
  });

  it("plays the play-offs from 3rd to 6th: two legs, then the final, and promotes the winner", () => {
    const played = playCareer({ reducer, initialState: champStart(11), seasons: 1 });
    const table = userAt(played.simulation.table, 4);
    let s = { ...played, simulation: { ...played.simulation, table, position: 4 }, discipline: {} };
    s = { ...s, playoffs: startPlayoffs({ ...s, campaign: { ...s.campaign } }, table, s.campaign.seed) };
    expect(s.playoffs.semi.opponent).toBe(table.find((r) => r.position === 5).name);
    expect(selectPlayoffFixture(s)).toMatchObject({ round: "semi1", home: false, venue: "A" });
    expect(selectNextAction(s)).toMatchObject({ key: "playPlayoff" });
    expect(reducer(s, { type: "GOTO_TRANSFER" })).toBe(s);
    const dispatch = driver(reducer, s);
    playPlayoffs(dispatch);
    const done = dispatch.last();
    expect(done.playoffs.stage).toBe("done");
    expect(done.playoffs.semi.legs).toHaveLength(2);
    expect(done.playoffs.semi.legs.map((m) => m.home)).toEqual([false, true]);
    const outcome = done.playoffs.winner === USER_TEAM ? "won" : done.playoffs.final ? "final" : "semi";
    expect(summarizeSeason(done).playoff).toBe(outcome);
    expect(done.simulation.tier.name).toBe({ won: "Play-off winners", final: "Play-off final", semi: "Play-off semi-final" }[outcome]);
    if (done.playoffs.final) expect(done.playoffs.final.match.home).toBe(false);
    const window = reducer(done, { type: "GOTO_TRANSFER" });
    expect(window.division).toBe(outcome === "won" ? "top" : "championship");
    expect(window.playoffs).toBeNull();
  });

  it("never goes below the Championship", () => {
    const played = playCareer({ reducer, initialState: champStart(5), seasons: 1 });
    const last = { ...played, simulation: { ...played.simulation, table: userAt(played.simulation.table, 24), position: 24 }, playoffs: null };
    const window = reducer(last, { type: "GOTO_TRANSFER" });
    expect(window.division).toBe("championship");
    expect(window.opponents).toHaveLength(23);
    expect(window.lastTransition.relegated).toHaveLength(2);
  });
});

describe("a top-flight career", () => {
  it("goes down from the bottom three and carries on in the Championship", () => {
    const played = playCareer({ reducer, initialState: makeInitialState(dataset, 9), seasons: 1 });
    const last = { ...played, simulation: { ...played.simulation, table: userAt(played.simulation.table, 20), position: 20 } };
    const window = reducer(last, { type: "GOTO_TRANSFER" });
    expect(window.division).toBe("championship");
    expect(window.lastTransition).toMatchObject({ userMove: "down", division: "championship" });
    expect(window.opponents).toHaveLength(23);
    expect(window.other).toHaveLength(20);
    // A 2000s top-flight career signs from the Championship's own seasons once it is down.
    for (const e of window.shortlist) expect(["5", "6"]).toContain(e.player.seasonKey.split("_")[1]);
    const season2 = reducer(reducer(window, { type: "CONTINUE_SEASON" }), { type: "START_SEASON" });
    expect(season2.campaign.order).toHaveLength(23);
  });

  it("round-trips a Championship season in progress through a save", () => {
    const played = playCareer({ reducer, initialState: champStart(13), seasons: 1 });
    const window = reducer(played, { type: "GOTO_TRANSFER" });
    const mid = reducer(reducer(reducer(reducer(window, { type: "CONTINUE_SEASON" }), { type: "START_SEASON" }), { type: "KICKOFF" }), { type: "PLAY_TO", until: "half" });
    const parsed = parseSaveText(toSaveText(makeSaveEnvelope(mid, { gameVersion: "3.0.0" })));
    expect(parsed.ok).toBe(true);
    expect(JSON.stringify(serializeState(hydrateState(parsed.save.state)))).toBe(JSON.stringify(serializeState(mid)));
  });
});
