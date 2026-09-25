// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { makeMiniDataset } from "../../tests/fixtures/miniDataset.js";
import { playCareer } from "../../tests/fixtures/playCareer.js";
import { createReducer } from "./reducer.js";
import { makeInitialState, REDRAWS } from "./initialState.js";
import {
  SAVE_VERSION, SAVE_ERRORS, serializeState, makeSaveEnvelope, toSaveText,
  validateSave, parseSaveText, hydrateState, describeSave,
} from "./save.js";
import { APP_VERSION } from "../version.js";

const NOW = new Date("2026-09-11T20:00:00.000Z");

function midCareerState() {
  const dataset = makeMiniDataset();
  const reducer = createReducer(dataset);
  let state = playCareer({ reducer, initialState: makeInitialState(dataset, 4242), seasons: 2 });
  state = reducer(state, { type: "GOTO_TRANSFER" });
  return reducer(state, { type: "CONTINUE_SEASON" }); // season 3, tactics
}

function landedDraftState() {
  const dataset = makeMiniDataset();
  const reducer = createReducer(dataset);
  let state = reducer(makeInitialState(dataset, 8), { type: "SET_ERA", min: 2000, max: 2011 });
  state = reducer(state, { type: "START_DRAFT" });
  return reducer(reducer(state, { type: "DRAW" }), { type: "LAND" });
}

// A v1.1 envelope built from a v2 state, the way the 1.1.0 build wrote it.
function asV1(state, { landed = false } = {}) {
  const { draw, seasonHistory, ...rest } = serializeState(state);
  void seasonHistory;
  const first = draw.options[0];
  const v1 = {
    ...rest,
    wheel: landed && first ? { spinning: false, landed: { year: first.year, clubId: first.clubId, label: first.label } } : { spinning: false, landed: null },
    pool: landed && first ? first.players : [],
    poolRelaxed: landed && first ? first.relaxed : false,
  };
  return { app: "fm-web", saveVersion: 1, gameVersion: "1.1.0", savedAt: NOW.toISOString(), state: v1 };
}

describe("save format", () => {
  it("is version 2", () => {
    expect(SAVE_VERSION).toBe(2);
  });

  it("round-trips a mid-career v2 state exactly", () => {
    const state = midCareerState();
    const text = toSaveText(makeSaveEnvelope(state, { gameVersion: "2.0.0", now: NOW }));
    const parsed = parseSaveText(text);
    expect(parsed.ok).toBe(true);
    expect(parsed.save).toMatchObject({ app: "fm-web", saveVersion: 2, gameVersion: "2.0.0", savedAt: "2026-09-11T20:00:00.000Z" });
    const restored = hydrateState(parsed.save.state);
    expect(restored.draftedIds).toBeInstanceOf(Set);
    expect(restored.seasonHistory).toHaveLength(2);
    expect(JSON.stringify(serializeState(restored))).toBe(JSON.stringify(serializeState(state)));
    expect(describeSave(parsed.save)).toEqual({ season: 3, seasonLabel: "2028-29", phaseLabel: "Tactics" });
  });

  it("round-trips a draw with cuttings on the desk", () => {
    const state = landedDraftState();
    expect(state.draw.options.length).toBeGreaterThan(1);
    const parsed = parseSaveText(toSaveText(makeSaveEnvelope(state, { gameVersion: "2.0.0", now: NOW })));
    expect(parsed.ok).toBe(true);
    expect(hydrateState(parsed.save.state).draw).toEqual(state.draw);
  });

  it("uses the real app version", () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("migrates a real 1.1.0 save captured from the previous build", () => {
    const text = readFileSync("tests/fixtures/save-v1.json", "utf8");
    const envelope = JSON.parse(text);
    expect(envelope).toMatchObject({ app: "fm-web", saveVersion: 1, gameVersion: "1.1.0" });
    expect(envelope.state).toHaveProperty("wheel");
    expect(envelope.state).not.toHaveProperty("draw");

    const parsed = parseSaveText(text);
    expect(parsed.ok).toBe(true);
    expect(parsed.save.saveVersion).toBe(2);
    expect(parsed.save.gameVersion).toBe("1.1.0");
    const { state } = parsed.save;
    expect(state).not.toHaveProperty("wheel");
    expect(state).not.toHaveProperty("pool");
    expect(state).not.toHaveProperty("poolRelaxed");
    expect(state.draw).toEqual({ spinning: false, options: [], redrawsLeft: REDRAWS });
    expect(state.seasonHistory).toEqual([]);
    expect(describeSave(parsed.save)).toEqual({ season: 2, seasonLabel: "2027-28", phaseLabel: "Transfer window" });

    const restored = hydrateState(state);
    expect(restored.draftedIds.size).toBe(envelope.state.draftedIds.length);
    const again = parseSaveText(toSaveText(makeSaveEnvelope(restored, { gameVersion: "2.0.0", now: NOW })));
    expect(again.ok).toBe(true);
    expect(JSON.stringify(again.save.state)).toBe(JSON.stringify(state));

    // The migrated career carries on: the next season plays from the saved seed and counter.
    const dataset = { ...JSON.parse(readFileSync("src/data/players.json", "utf8")), championship: JSON.parse(readFileSync("src/data/championship.json", "utf8")) };
    const reducer = createReducer(dataset);
    let next = reducer(restored, { type: "CONTINUE_SEASON" });
    next = reducer(next, { type: "SIMULATE" });
    expect(next.phase).toBe("reveal");
    expect(next.simulation.matches).toHaveLength(38);
    expect(next.rngCounter).toBe(envelope.state.rngCounter + 1);
  });

  it("turns a v1 wheel that had landed into a one-cutting draw", () => {
    const state = landedDraftState();
    const parsed = validateSave(asV1(state, { landed: true }));
    expect(parsed.ok).toBe(true);
    const first = state.draw.options[0];
    expect(parsed.save.state.draw).toEqual({ spinning: false, options: [{ ...first, relaxed: false }], redrawsLeft: REDRAWS });
    expect(validateSave(asV1(state)).save.state.draw.options).toEqual([]);
  });

  it("rejects saves from other apps, newer versions, and damaged files", () => {
    const good = JSON.parse(toSaveText(makeSaveEnvelope(midCareerState(), { gameVersion: "2.0.0", now: NOW })));
    expect(validateSave({ ...good, app: "other" })).toEqual({ ok: false, reason: SAVE_ERRORS.notFmWeb });
    expect(validateSave(null)).toEqual({ ok: false, reason: SAVE_ERRORS.notFmWeb });
    expect(validateSave({ ...good, saveVersion: SAVE_VERSION + 1 })).toEqual({ ok: false, reason: SAVE_ERRORS.newer });
    expect(validateSave({ ...good, saveVersion: 1, state: null })).toEqual({ ok: false, reason: SAVE_ERRORS.damaged });
    expect(parseSaveText("{not json")).toEqual({ ok: false, reason: SAVE_ERRORS.notFmWeb });

    const damaged = (mutate) => {
      const copy = structuredClone(good);
      mutate(copy.state);
      return validateSave(copy);
    };
    expect(damaged((s) => { s.phase = "lobby"; })).toEqual({ ok: false, reason: SAVE_ERRORS.damaged });
    expect(damaged((s) => { s.assignments.pop(); })).toEqual({ ok: false, reason: SAVE_ERRORS.damaged });
    expect(damaged((s) => { s.opponents.pop(); })).toEqual({ ok: false, reason: SAVE_ERRORS.damaged });
    expect(damaged((s) => { s.assignments[0].player.stats.pace = "fast"; })).toEqual({ ok: false, reason: SAVE_ERRORS.damaged });
    expect(damaged((s) => { s.careerSeed = -1; })).toEqual({ ok: false, reason: SAVE_ERRORS.damaged });
    expect(damaged((s) => { delete s.rngCounter; })).toEqual({ ok: false, reason: SAVE_ERRORS.damaged });
    expect(damaged((s) => { s.draftDone = "yes"; })).toEqual({ ok: false, reason: SAVE_ERRORS.damaged });
    expect(damaged((s) => { s.selectedStyle = "not-a-style"; })).toEqual({ ok: false, reason: SAVE_ERRORS.damaged });
    expect(damaged((s) => { s.lastTransition = "corrupt"; })).toEqual({ ok: false, reason: SAVE_ERRORS.damaged });
    expect(damaged((s) => { s.lastTransition = { relegated: ["A"], promoted: [1] }; })).toEqual({ ok: false, reason: SAVE_ERRORS.damaged });
    expect(damaged((s) => { delete s.draw; })).toEqual({ ok: false, reason: SAVE_ERRORS.damaged });
    expect(damaged((s) => { s.draw.redrawsLeft = REDRAWS + 1; })).toEqual({ ok: false, reason: SAVE_ERRORS.damaged });
    expect(damaged((s) => { s.draw.options = [{ year: "2000", clubId: "1", label: "x", players: [], relaxed: false }]; })).toEqual({ ok: false, reason: SAVE_ERRORS.damaged });
    expect(damaged((s) => { s.draw.options = [{ year: 2000, clubId: "1", label: "x", players: s.shortlist.map((e) => e.player), relaxed: false }]; })).toEqual({ ok: false, reason: SAVE_ERRORS.damaged });
    expect(damaged((s) => { s.seasonHistory = "none"; })).toEqual({ ok: false, reason: SAVE_ERRORS.damaged });
    expect(damaged((s) => { s.seasonHistory[0].pts = "lots"; })).toEqual({ ok: false, reason: SAVE_ERRORS.damaged });
    expect(damaged((s) => { s.seasonHistory[0].identity = 7; })).toEqual({ ok: false, reason: SAVE_ERRORS.damaged });
  });

  it("resets a draw that was saved mid-spin", () => {
    const state = { ...landedDraftState(), draw: { spinning: true, options: [], redrawsLeft: 1 } };
    const restored = hydrateState(serializeState(state));
    expect(restored.draw).toEqual({ spinning: false, options: [], redrawsLeft: 1 });
    const landed = hydrateState(serializeState(landedDraftState()));
    expect(landed.draw.options.length).toBeGreaterThan(0);
  });
});
