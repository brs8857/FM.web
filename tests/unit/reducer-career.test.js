// @vitest-environment node
import { describe, it, expect } from "vitest";
import { makeMiniDataset } from "../fixtures/miniDataset.js";
import { playCareer } from "../fixtures/playCareer.js";
import { createReducer, summarizeSeason } from "../../src/state/reducer.js";
import { makeInitialState, DRAW_OPTIONS, REDRAWS } from "../../src/state/initialState.js";
import { playerIdentity, isSameRealPlayer } from "../../src/engine/identity.js";
import { createSquadLookup } from "../../src/engine/players.js";
import { makeInitialAssignments } from "../../src/engine/formations.js";
import { computeFamiliarity } from "../../src/engine/familiarity.js";
import { wageCost, windowBudget } from "../../src/engine/squad.js";
import { liveAssignments } from "../../src/state/selectors.js";

export function checkInvariants(state, action, previous) {
  const label = action.type;
  expect(state.assignments, label).toHaveLength(11);
  expect(state.bench.length, label).toBeLessThanOrEqual(6);
  const ids = [...state.assignments, ...state.bench].map((e) => e.player?.id).filter(Boolean);
  expect(new Set(ids).size, label).toBe(ids.length);
  expect(state.opponents, label).toHaveLength(19);
  expect(state.rngCounter, label).toBeGreaterThanOrEqual(previous.rngCounter);
  expect(state.draftedIdentities, label).toHaveLength(state.draftedIds.size);
  expect(state.draw.options.length, label).toBeLessThanOrEqual(DRAW_OPTIONS);
  expect(new Set(state.draw.options.map((o) => `${o.year}_${o.clubId}`)).size, label).toBe(state.draw.options.length);
  expect(state.draw.redrawsLeft, label).toBeGreaterThanOrEqual(0);
  expect(state.seasonHistory.map((s) => s.season), label).toEqual(state.seasonHistory.map((_, i) => i + 1));
  const owned = [...state.assignments, ...state.bench].map((e) => e.player).filter(Boolean).map(playerIdentity);
  owned.forEach((a, i) => owned.slice(i + 1).forEach((b) => expect(isSameRealPlayer(a, b), `${label}: ${a.name}`).toBe(false)));
}

function draftState(seed, overrides = {}) {
  const dataset = makeMiniDataset();
  const reducer = createReducer(dataset);
  const state = { ...makeInitialState(dataset, seed), phase: "draft", ...overrides };
  return { dataset, reducer, state };
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
    expect(final.draw.redrawsLeft).toBe(REDRAWS - 1);
    expect(final.seasonHistory).toHaveLength(5);
    expect(final.seasonHistory[4]).toMatchObject({ season: 5, seed: 7, identity: "Gegenpress" });
  });

  it("SET_FORMATION empties the squad but keeps the era", () => {
    const dataset = makeMiniDataset();
    const reducer = createReducer(dataset);
    let state = reducer(makeInitialState(dataset, 7), { type: "SET_ERA", min: 2000, max: 2005 });
    state = reducer(state, { type: "SET_FORMATION", key: "4-4-2" });
    expect(state.formationKey).toBe("4-4-2");
    expect(state.assignments.every((a) => a.player === null)).toBe(true);
    expect([state.eraMin, state.eraMax]).toEqual([2000, 2005]);
    expect(state.draw).toEqual({ spinning: false, options: [], redrawsLeft: REDRAWS });
  });

  it("NEW_GAME starts over with the given seed", () => {
    const dataset = makeMiniDataset();
    const reducer = createReducer(dataset);
    const played = playCareer({ reducer, initialState: makeInitialState(dataset, 7), seasons: 1 });
    const fresh = reducer(played, { type: "NEW_GAME", seed: 99 });
    expect(fresh).toEqual(makeInitialState(dataset, 99));
  });
});

describe("the draw", () => {
  it("DRAW spins, LAND offers three distinct club-seasons with players for the next slot", () => {
    const { reducer, state } = draftState(11, { eraMin: 2000, eraMax: 2011 });
    const spinning = reducer(state, { type: "DRAW" });
    expect(spinning.draw).toMatchObject({ spinning: true, options: [] });
    const landed = reducer(spinning, { type: "LAND" });
    expect(landed.draw.spinning).toBe(false);
    expect(landed.draw.options).toHaveLength(DRAW_OPTIONS);
    expect(new Set(landed.draw.options.map((o) => o.label)).size).toBe(DRAW_OPTIONS);
    for (const option of landed.draw.options) {
      expect(option).toMatchObject({ year: expect.any(String), clubId: expect.any(String), label: expect.any(String), relaxed: false });
      expect(option.players.length).toBeGreaterThan(0);
      expect(option.players.every((p) => p.slot === "GK" && p.seasonKey === `${option.year}_${option.clubId}`)).toBe(true);
    }
    expect(landed.rngCounter).toBe(state.rngCounter + 1);
  });

  it("offers fewer cuttings when the era has fewer club-seasons", () => {
    const { reducer, state } = draftState(5, { eraMin: 2005, eraMax: 2005 });
    const landed = reducer(reducer(state, { type: "DRAW" }), { type: "LAND" });
    expect(landed.draw.options).toHaveLength(1);
  });

  it("DRAW is ignored while cuttings are on the desk; REDRAW replaces them and costs one of two", () => {
    const { reducer, state } = draftState(3, { eraMin: 2000, eraMax: 2011 });
    let s = reducer(reducer(state, { type: "DRAW" }), { type: "LAND" });
    const first = s.draw.options;
    expect(reducer(s, { type: "DRAW" })).toBe(s);
    s = reducer(s, { type: "REDRAW" });
    expect(s.draw.redrawsLeft).toBe(1);
    expect(s.draw.options).toHaveLength(DRAW_OPTIONS);
    expect(s.draw.options).not.toEqual(first);
    s = reducer(s, { type: "REDRAW" });
    expect(s.draw.redrawsLeft).toBe(0);
    const spent = reducer(s, { type: "REDRAW" });
    expect(spent).toBe(s);
  });

  it("REDRAW does nothing with no cuttings out, and redraws carry across picks", () => {
    const { reducer, state } = draftState(3, { eraMin: 2000, eraMax: 2011 });
    expect(reducer(state, { type: "REDRAW" })).toBe(state);
    let s = reducer(reducer(state, { type: "DRAW" }), { type: "LAND" });
    s = reducer(s, { type: "REDRAW" });
    s = reducer(s, { type: "PICK_PLAYER", player: s.draw.options[1].players[0] });
    expect(s.draw).toEqual({ spinning: false, options: [], redrawsLeft: 1 });
    expect(s.assignments[0].player.slot).toBe("GK");
    expect(s.draftDone).toBe(false);
  });

  it("flags a relaxed cutting when the landed squad has no player for the slot", () => {
    const dataset = makeMiniDataset();
    const reducer = createReducer(dataset);
    let state = makeInitialState(dataset, 3);
    state = reducer(state, { type: "SET_FORMATION", key: "4-1-4-1" }); // slot 6 is the DM
    state = reducer(state, { type: "SET_ERA", min: 2005, max: 2005 }); // only Gamma Town 2005-06, which has no DM
    state = reducer(state, { type: "START_DRAFT" });
    for (let pick = 0; pick < 5; pick++) {
      state = reducer(reducer(state, { type: "DRAW" }), { type: "LAND" });
      expect(state.draw.options[0].relaxed).toBe(false);
      state = reducer(state, { type: "PICK_PLAYER", player: state.draw.options[0].players[0] });
    }
    state = reducer(reducer(state, { type: "DRAW" }), { type: "LAND" });
    expect(state.draw.options[0].relaxed).toBe(true);
    expect(state.draw.options[0].players.some((p) => p.slot !== "DM")).toBe(true);
  });

  it("passes over squads with nobody left and lets the player draw again for free when none remain", () => {
    const dataset = makeMiniDataset();
    const reducer = createReducer(dataset);
    const everyone = ["2000_1", "2000_2"].flatMap((key) => dataset.squads[key].map((row) => `${key}__${row[0]}__${row[5]}__${row[1]}`));
    let state = { ...makeInitialState(dataset, 5), phase: "draft", eraMin: 2000, eraMax: 2000, draftedIds: new Set(everyone) };
    state = reducer(reducer(state, { type: "DRAW" }), { type: "LAND" });
    expect(state.draw).toEqual({ spinning: false, options: [], redrawsLeft: REDRAWS });
    expect(reducer(state, { type: "DRAW" }).draw.spinning).toBe(true);

    const alphaOnly = { ...makeInitialState(dataset, 5), phase: "draft", eraMin: 2000, eraMax: 2001, draftedIds: new Set(everyone.filter((id) => id.startsWith("2000_1"))) };
    for (let seed = 1; seed <= 20; seed++) {
      const landed = reducer(reducer({ ...alphaOnly, careerSeed: seed }, { type: "DRAW" }), { type: "LAND" });
      expect(landed.draw.options.map((o) => `${o.year}_${o.clubId}`)).not.toContain("2000_1");
      expect(landed.draw.options.length).toBeGreaterThan(0);
    }
  });

  it("LAND never offers an already-owned real player even when their club season comes up", () => {
    const dataset = makeMiniDataset();
    const reducer = createReducer(dataset);
    const getSquad = createSquadLookup(dataset);
    const sam2000 = getSquad("2000", "1").find((p) => p.name === "Sam Twice");
    const ownedIdentity = playerIdentity(sam2000);
    // Sam Twice is an ST, so the next empty slot must be an ST slot (not the
    // default first-empty GK slot) or slotAccepts would filter him out of any
    // pool regardless of identity exclusion, masking the very thing this test
    // checks. Pre-fill every non-ST slot with a placeholder so the draft's
    // next empty slot is guaranteed to be the ST slot.
    const filler = { id: "filler" };
    const assignments = makeInitialAssignments("4-3-3").map((a) => a.type === "ST" ? a : { ...a, player: filler });

    let sawClub1 = false;
    for (let seed = 1; seed <= 40; seed++) {
      let state = {
        ...makeInitialState(dataset, seed), phase: "draft", eraMin: 2000, eraMax: 2001,
        assignments, draftedIdentities: [ownedIdentity],
      };
      state = reducer(reducer(state, { type: "DRAW" }), { type: "LAND" });
      const club1 = state.draw.options.find((o) => o.clubId === "1");
      if (club1) {
        sawClub1 = true;
        expect(club1.players.map((p) => p.name)).not.toContain("Sam Twice");
      }
    }
    expect(sawClub1).toBe(true); // sanity: confirms the scenario was actually exercised, not just hoped for
  });

  it("ignores draw actions once the XI is complete", () => {
    const dataset = makeMiniDataset();
    const reducer = createReducer(dataset);
    const done = playCareer({ reducer, initialState: makeInitialState(dataset, 7), seasons: 1 });
    expect(done.draftDone).toBe(true);
    expect(reducer(done, { type: "DRAW" })).toBe(done);
    expect(reducer(done, { type: "LAND" })).toBe(done);
    expect(reducer(done, { type: "REDRAW" })).toBe(done);
  });
});

describe("the summer", () => {
  it("CONTINUE_SEASON ages the XI and the bench a year and records who retired", () => {
    const dataset = makeMiniDataset();
    const reducer = createReducer(dataset);
    let state = playCareer({ reducer, initialState: makeInitialState(dataset, 4242), seasons: 1 });
    state = reducer(state, { type: "GOTO_TRANSFER" });
    const before = [...state.assignments, ...state.bench].map((e) => e.player).filter(Boolean);
    const next = reducer(state, { type: "CONTINUE_SEASON" });
    expect(next.rngCounter).toBe(state.rngCounter + 1);
    expect(next.lastTransition).toEqual({ ...state.lastTransition, retired: [] });
    const after = [...next.assignments, ...next.bench].map((e) => e.player).filter(Boolean);
    expect(after).toHaveLength(before.length);
    for (const p of after) {
      const was = before.find((b) => b.id === p.id);
      expect(p.age).toBe(was.age + 1);
      expect(p.seasonKey).toBe(was.seasonKey);
    }
    expect(after.some((p) => p.ov !== before.find((b) => b.id === p.id).ov)).toBe(true);
  });

  it("retires a 36-year-old over the summer and takes his place from the bench", () => {
    const dataset = makeMiniDataset();
    const reducer = createReducer(dataset);
    let state = playCareer({ reducer, initialState: makeInitialState(dataset, 4242), seasons: 1 });
    state = reducer(state, { type: "GOTO_TRANSFER" });
    const st = state.assignments.find((a) => a.slotId === "ST");
    const veteran = { ...st.player, age: 35 };
    state = { ...state, assignments: state.assignments.map((a) => (a.slotId === "ST" ? { ...a, player: veteran } : a)) };
    const next = reducer(state, { type: "CONTINUE_SEASON" });
    expect(next.lastTransition.retired).toEqual([veteran.name]);
    expect(next.assignments.find((a) => a.slotId === "ST").player.id).not.toBe(veteran.id);
    expect(next.bench).toHaveLength(state.bench.length - 1);
    expect(next.draftedIds.has(veteran.id)).toBe(true);
  });
});

describe("cohesion memory", () => {
  it("remembers the system across seasons and pays the seasons already played in it", () => {
    const dataset = makeMiniDataset();
    const reducer = createReducer(dataset);
    const played = playCareer({ reducer, initialState: makeInitialState(dataset, 7), seasons: 3 });
    expect(played.cohesionMemory).toEqual({ formationKey: "4-3-3", styleKey: "Gegenpress", seasons: 3 });
    expect(played.seasonHistory.map((s) => s.familiarity)).toHaveLength(2);
    const one = playCareer({ reducer, initialState: makeInitialState(dataset, 7), seasons: 1 });
    expect(one.cohesionMemory.seasons).toBe(1);
    const fresh = computeFamiliarity(liveAssignments(one.assignments), one.instructions, one.formationKey);
    expect(one.simulation.familiarity).toBe(fresh);
    let state = reducer(one, { type: "GOTO_TRANSFER" });
    state = reducer(state, { type: "CONTINUE_SEASON" });
    const second = reducer(state, { type: "SIMULATE" });
    const withoutMemory = computeFamiliarity(liveAssignments(state.assignments), state.instructions, state.formationKey);
    expect(second.simulation.familiarity).toBe(withoutMemory + 2);
    const changed = reducer(reducer(state, { type: "SET_STYLE", key: "parkbus" }), { type: "SIMULATE" });
    const parkbus = computeFamiliarity(liveAssignments(state.assignments), changed.instructions, state.formationKey);
    expect(changed.simulation.familiarity).toBe(parkbus - 4);
    expect(changed.cohesionMemory).toEqual({ formationKey: "4-3-3", styleKey: "Park The Bus", seasons: 1 });
  });
});

describe("the window's budget", () => {
  it("opens with eight costed candidates and a budget from the finish, and refuses what it cannot afford", () => {
    const dataset = makeMiniDataset();
    const reducer = createReducer(dataset);
    const played = playCareer({ reducer, initialState: makeInitialState(dataset, 4242), seasons: 1 });
    const opened = reducer(played, { type: "GOTO_TRANSFER" });
    expect(opened.shortlist).toHaveLength(8);
    for (const entry of opened.shortlist) expect(entry).toMatchObject({ signed: false, cost: wageCost(entry.player) });
    expect(opened.transferBudget).toEqual({ points: windowBudget(played.simulation.position), spent: 0 });

    const tight = { ...opened, transferBudget: { points: 3, spent: 0 }, shortlist: opened.shortlist.map((e, i) => ({ ...e, cost: i === 0 ? 2 : i === 1 ? 2 : 4 })) };
    const one = reducer(tight, { type: "SIGN_SHORTLIST_TO_BENCH", index: 0 });
    expect(one.transferBudget).toEqual({ points: 3, spent: 2 });
    expect(one.shortlist[0].signed).toBe(true);
    expect(reducer(one, { type: "SIGN_SHORTLIST_TO_BENCH", index: 1 })).toBe(one);
    expect(reducer(one, { type: "SIGN_SHORTLIST_TO_XI", index: 2, slotId: "ST" })).toBe(one);
    expect(reducer(tight, { type: "SIGN_SHORTLIST_TO_XI", index: 2, slotId: "ST" })).toBe(tight);
    const xi = reducer(one, { type: "SIGN_SHORTLIST_TO_XI", index: 1, slotId: "ST" });
    expect(xi).toBe(one);
    const cheaper = { ...one, shortlist: one.shortlist.map((e, i) => (i === 1 ? { ...e, cost: 1 } : e)) };
    const signed = reducer(cheaper, { type: "SIGN_SHORTLIST_TO_XI", index: 1, slotId: "ST" });
    expect(signed.transferBudget).toEqual({ points: 3, spent: 3 });
    expect(signed.assignments.find((a) => a.slotId === "ST").player.id).toBe(cheaper.shortlist[1].player.id);
  });
});

describe("the record", () => {
  it("GOTO_TRANSFER appends the season summary and CONTINUE_SEASON keeps it", () => {
    const dataset = makeMiniDataset();
    const reducer = createReducer(dataset);
    let state = playCareer({ reducer, initialState: makeInitialState(dataset, 4242), seasons: 1 });
    expect(state.seasonHistory).toEqual([]);
    const expected = summarizeSeason(state);
    expect(expected).toEqual({
      season: 1, position: state.simulation.position, pts: state.simulation.pts,
      w: state.simulation.w, d: state.simulation.d, l: state.simulation.l, gf: state.simulation.gf, ga: state.simulation.ga,
      tier: state.simulation.tier.name, identity: state.simulation.profile.synergyLabel, familiarity: state.simulation.familiarity, seed: 4242,
    });
    state = reducer(state, { type: "GOTO_TRANSFER" });
    expect(state.seasonHistory).toEqual([expected]);
    state = reducer(state, { type: "CONTINUE_SEASON" });
    expect(state.seasonHistory).toEqual([expected]);
    expect(state.simulation).toBeNull();
  });
});
