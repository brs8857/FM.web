// @vitest-environment node
import { describe, it, expect } from "vitest";
import { makeMiniDataset } from "../../tests/fixtures/miniDataset.js";
import { playCareer } from "../../tests/fixtures/playCareer.js";
import { createReducer } from "./reducer.js";
import { makeInitialState } from "./initialState.js";
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

describe("save format", () => {
  it("round-trips a mid-career state exactly", () => {
    const state = midCareerState();
    const text = toSaveText(makeSaveEnvelope(state, { gameVersion: "1.1.0", now: NOW }));
    const parsed = parseSaveText(text);
    expect(parsed.ok).toBe(true);
    expect(parsed.save).toMatchObject({ app: "fm-web", saveVersion: SAVE_VERSION, gameVersion: "1.1.0", savedAt: "2026-09-11T20:00:00.000Z" });
    const restored = hydrateState(parsed.save.state);
    expect(restored.draftedIds).toBeInstanceOf(Set);
    expect(JSON.stringify(serializeState(restored))).toBe(JSON.stringify(serializeState(state)));
    expect(describeSave(parsed.save)).toEqual({ season: 3, seasonLabel: "2028-29", phaseLabel: "Tactics" });
  });

  it("uses the real app version", () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("rejects saves from other apps, newer versions, and damaged files", () => {
    const good = JSON.parse(toSaveText(makeSaveEnvelope(midCareerState(), { gameVersion: "1.1.0", now: NOW })));
    expect(validateSave({ ...good, app: "other" })).toEqual({ ok: false, reason: SAVE_ERRORS.notFmWeb });
    expect(validateSave(null)).toEqual({ ok: false, reason: SAVE_ERRORS.notFmWeb });
    expect(validateSave({ ...good, saveVersion: SAVE_VERSION + 1 })).toEqual({ ok: false, reason: SAVE_ERRORS.newer });
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
  });

  it("resets a wheel that was saved mid-spin", () => {
    const state = { ...midCareerState(), phase: "draft", wheel: { spinning: true, landed: null }, pool: [{ id: "x" }] };
    const restored = hydrateState(serializeState(state));
    expect(restored.wheel).toEqual({ spinning: false, landed: null });
    expect(restored.pool).toEqual([]);
  });
});
