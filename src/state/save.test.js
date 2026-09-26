// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { makeMiniDataset } from "../../tests/fixtures/miniDataset.js";
import { playCareer } from "../../tests/fixtures/playCareer.js";
import { createReducer } from "./reducer.js";
import { makeInitialState, REDRAWS } from "./initialState.js";
import {
  SAVE_VERSION, SAVE_ERRORS, serializeState, makeSaveEnvelope, toSaveText,
  validateSave, parseSaveText, hydrateState, describeSave, rekeySeasonKey, rekeyState, rememberedSystem,
} from "./save.js";
import { APP_VERSION } from "../version.js";
import { EMPTY_MEMORY } from "../engine/familiarity.js";

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
  it("is version 4", () => {
    expect(SAVE_VERSION).toBe(4);
  });

  it("round-trips a mid-career state exactly", () => {
    const state = midCareerState();
    const text = toSaveText(makeSaveEnvelope(state, { gameVersion: "2.0.0", now: NOW }));
    const parsed = parseSaveText(text);
    expect(parsed.ok).toBe(true);
    expect(parsed.save).toMatchObject({ app: "fm-web", saveVersion: 4, gameVersion: "2.0.0", savedAt: "2026-09-11T20:00:00.000Z" });
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
    expect(parsed.save.saveVersion).toBe(4);
    expect(parsed.save.gameVersion).toBe("1.1.0");
    const { state } = parsed.save;
    expect(state).not.toHaveProperty("wheel");
    expect(state).not.toHaveProperty("pool");
    expect(state).not.toHaveProperty("poolRelaxed");
    expect(state.draw).toEqual({ spinning: false, options: [], redrawsLeft: REDRAWS });
    expect(state.seasonHistory).toEqual([]);
    expect(state.cohesionMemory).toEqual({ formationKey: null, styleKey: null, seasons: 0, signature: null, matches: 0 });
    expect(state.transferBudget).toEqual({ points: 7, spent: 1 }); // fifth last season; one 70-rated signing
    expect(state.shortlist.map((e) => e.cost)).toEqual([3, 5, 1, 4, 3]);
    expect(describeSave(parsed.save)).toEqual({ season: 2, seasonLabel: "2027-28", phaseLabel: "Transfer window" });

    const restored = hydrateState(state);
    expect(restored.draftedIds.size).toBe(envelope.state.draftedIds.length);
    const again = parseSaveText(toSaveText(makeSaveEnvelope(restored, { gameVersion: "2.0.0", now: NOW })));
    expect(again.ok).toBe(true);
    expect(JSON.stringify(again.save.state)).toBe(JSON.stringify(state));

    // Club ids were Transfermarkt numbers in 1.1.0 and are slugs now (B10):
    // every season key, player id and drafted id resolves to a real squad.
    const dataset = { ...JSON.parse(readFileSync("src/data/players.json", "utf8")), championship: JSON.parse(readFileSync("src/data/championship.json", "utf8")) };
    expect(envelope.state.assignments[0].player.seasonKey).toMatch(/^\d{4}_\d+$/);
    const players = [...state.assignments, ...state.bench, ...state.shortlist].map((e) => e.player).filter(Boolean);
    for (const p of players) {
      expect(p.seasonKey).toMatch(/^\d{4}_[a-z-]+$/);
      expect(dataset.squads[p.seasonKey], p.seasonKey).toBeDefined();
      expect(p.id.startsWith(`${p.seasonKey}__`)).toBe(true);
      expect(dataset.squads[p.seasonKey].some((row) => row[0] === p.name)).toBe(true);
    }
    for (const id of state.draftedIds) expect(id).toMatch(/^\d{4}_[a-z-]+__/);
    expect(state.draftedIds).toContain(state.assignments[0].player.id);

    // The migrated career carries on: the next season plays from the saved seed and counter.
    const reducer = createReducer(dataset);
    let next = reducer(restored, { type: "CONTINUE_SEASON" });
    next = reducer(next, { type: "START_SEASON" });
    expect(next.phase).toBe("reveal");
    expect(next.rngCounter).toBe(envelope.state.rngCounter + 2); // the summer and the season each take a draw
    next = reducer(reducer(next, { type: "KICKOFF" }), { type: "PLAY_TO", until: "end" });
    expect(next.simulation.matches).toHaveLength(38);
    expect(next.rngCounter).toBe(envelope.state.rngCounter + 2);
    next = reducer(next, { type: "GOTO_TRANSFER" });
    expect(next.shortlist.every((e) => /^\d{4}_[a-z-]+$/.test(e.player.seasonKey))).toBe(true);
  });

  it("rekeys a landed v1 wheel and leaves slugs and unknown ids alone", () => {
    expect(rekeySeasonKey("1997_11")).toBe("1997_arsenal");
    expect(rekeySeasonKey("1997_arsenal")).toBe("1997_arsenal");
    expect(rekeySeasonKey("2000_1")).toBe("2000_1");
    const player = { id: "2003_399__Mark Viduka__88__ST", name: "Mark Viduka", seasonKey: "2003_399" };
    const state = rekeyState({ assignments: [{ player }], bench: [], shortlist: [], draftedIds: [player.id], draw: { spinning: false, redrawsLeft: 2, options: [{ year: "2003", clubId: "399", label: "Leeds United 2003-04", players: [player], relaxed: false }] } });
    expect(state.assignments[0].player).toEqual({ id: "2003_leeds-united__Mark Viduka__88__ST", name: "Mark Viduka", seasonKey: "2003_leeds-united" });
    expect(state.draftedIds).toEqual(["2003_leeds-united__Mark Viduka__88__ST"]);
    expect(state.draw.options[0]).toMatchObject({ clubId: "leeds-united", players: [{ seasonKey: "2003_leeds-united" }] });
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
    expect(damaged((s) => { delete s.cohesionMemory; })).toEqual({ ok: false, reason: SAVE_ERRORS.damaged });
    expect(damaged((s) => { s.cohesionMemory.seasons = -1; })).toEqual({ ok: false, reason: SAVE_ERRORS.damaged });
    expect(damaged((s) => { delete s.transferBudget; })).toEqual({ ok: false, reason: SAVE_ERRORS.damaged });
    expect(damaged((s) => { s.shortlist = [{ player: s.assignments[0].player, signed: false }]; })).toEqual({ ok: false, reason: SAVE_ERRORS.damaged });
  });

  it("migrates a real 2.0.0 save captured from the tagged build", () => {
    const text = readFileSync("tests/fixtures/save-v2.json", "utf8");
    const envelope = JSON.parse(text);
    expect(envelope).toMatchObject({ app: "fm-web", saveVersion: 2, gameVersion: "2.0.0" });
    expect(envelope.state).not.toHaveProperty("cohesionMemory");
    expect(envelope.state).not.toHaveProperty("transferBudget");
    expect(envelope.state.shortlist).toHaveLength(5);

    const parsed = parseSaveText(text);
    expect(parsed.ok).toBe(true);
    expect(parsed.save.saveVersion).toBe(4);
    const { state } = parsed.save;
    // Three seasons of Gegenpress in the 4-3-3, all champions, the window open.
    expect(state.seasonHistory.map((h) => h.identity)).toEqual(["Gegenpress", "Gegenpress", "Gegenpress"]);
    expect(state.cohesionMemory).toEqual({ formationKey: "4-3-3", styleKey: "Gegenpress", seasons: 3, signature: null, matches: 0 });
    expect(state.shortlist.every((e) => Number.isInteger(e.cost) && e.cost >= 1 && e.cost <= 5)).toBe(true);
    const signedCost = state.shortlist.filter((e) => e.signed).reduce((sum, e) => sum + e.cost, 0);
    expect(state.transferBudget).toEqual({ points: 9, spent: Math.min(9, signedCost) });
    const ages = (s) => [...s.assignments, ...s.bench].map((e) => e.player?.age);
    expect(ages(state)).toEqual(ages(envelope.state));

    // The career carries on: the summer ages the squad and the memory counts a fourth season.
    const dataset = { ...JSON.parse(readFileSync("src/data/players.json", "utf8")), championship: JSON.parse(readFileSync("src/data/championship.json", "utf8")) };
    const reducer = createReducer(dataset);
    let next = reducer(hydrateState(state), { type: "CONTINUE_SEASON" });
    const aged = next.assignments.filter((a, i) => a.player && state.assignments[i].player?.id === a.player.id && typeof a.player.age === "number");
    expect(aged.length).toBeGreaterThan(0);
    for (const a of aged) expect(a.player.age).toBe(state.assignments.find((b) => b.player?.id === a.player.id).player.age + 1);
    next = reducer(reducer(reducer(next, { type: "START_SEASON" }), { type: "KICKOFF" }), { type: "PLAY_TO", until: "end" });
    expect(next.cohesionMemory).toEqual({ ...EMPTY_MEMORY, formationKey: "4-3-3", styleKey: "Gegenpress", seasons: 4 });
    expect(next.simulation.matches).toHaveLength(38);
  });

  it("migrates a real 2.5.0 save paused at the ratings reveal by restarting that season from kick-off", () => {
    const text = readFileSync("tests/fixtures/save-v3.json", "utf8");
    const envelope = JSON.parse(text);
    expect(envelope).toMatchObject({ app: "fm-web", saveVersion: 3, gameVersion: "2.5.0", state: { phase: "reveal", season: 2 } });
    expect(envelope.state.cohesionMemory).toEqual({ formationKey: "4-3-3", styleKey: "Gegenpress", seasons: 2 });

    const parsed = parseSaveText(text);
    expect(parsed.ok).toBe(true);
    const { state } = parsed.save;
    expect(parsed.save.saveVersion).toBe(4);
    expect(state).toMatchObject({ phase: "tactics", season: 2, simulation: null, campaign: null, rngCounter: envelope.state.rngCounter });
    expect(state.cohesionMemory).toEqual({ ...EMPTY_MEMORY, formationKey: "4-3-3", styleKey: "Gegenpress", seasons: 1 });
    expect(state.seasonHistory).toHaveLength(1);
    expect(state.seasonHistory[0]).toMatchObject({ season: 1, matches: [], topScorer: null });
    expect(describeSave(parsed.save)).toEqual({ season: 2, seasonLabel: "2027-28", phaseLabel: "Tactics" });

    const dataset = { ...JSON.parse(readFileSync("src/data/players.json", "utf8")), championship: JSON.parse(readFileSync("src/data/championship.json", "utf8")) };
    const reducer = createReducer(dataset);
    let next = reducer(hydrateState(state), { type: "START_SEASON" });
    next = reducer(reducer(next, { type: "KICKOFF" }), { type: "PLAY_TO", until: "end" });
    expect(next).toMatchObject({ phase: "result", season: 2 });
    expect(next.cohesionMemory.seasons).toBe(2);
    expect(parseSaveText(toSaveText(makeSaveEnvelope(next, { gameVersion: "2.7.0", now: NOW }))).ok).toBe(true);
  });

  it("keeps a 2.5.0 season on its back page, without a match log, and records it without one", () => {
    const envelope = JSON.parse(readFileSync("tests/fixtures/save-v3.json", "utf8"));
    const result = { ...envelope, state: { ...envelope.state, phase: "result" } };
    const parsed = validateSave(result);
    expect(parsed.ok).toBe(true);
    const { state } = parsed.save;
    expect(state.phase).toBe("result");
    expect(state.simulation).toEqual(envelope.state.simulation);
    expect(state.cohesionMemory).toEqual({ ...EMPTY_MEMORY, ...envelope.state.cohesionMemory });
    expect(describeSave(parsed.save).phaseLabel).toBe("Season result");

    const dataset = { ...JSON.parse(readFileSync("src/data/players.json", "utf8")), championship: JSON.parse(readFileSync("src/data/championship.json", "utf8")) };
    const reducer = createReducer(dataset);
    const window = reducer(hydrateState(state), { type: "GOTO_TRANSFER" });
    expect(window.phase).toBe("transfer");
    expect(window.seasonHistory.at(-1)).toMatchObject({ season: 2, pts: envelope.state.simulation.pts, matches: [], topScorer: null });
    expect(parseSaveText(toSaveText(makeSaveEnvelope(window, { gameVersion: "2.7.0", now: NOW }))).ok).toBe(true);
  });

  it("migrates a 2.0.0 save paused at the reveal the same way", () => {
    const envelope = JSON.parse(readFileSync("tests/fixtures/save-v3.json", "utf8"));
    const { cohesionMemory, transferBudget, ...v2state } = envelope.state;
    void cohesionMemory; void transferBudget;
    const strip = (e) => ({ ...e, player: e.player && (({ age, ...p }) => { void age; return p; })(e.player) });
    const v2 = { ...envelope, saveVersion: 2, gameVersion: "2.0.0", state: { ...v2state, assignments: v2state.assignments.map(strip), bench: v2state.bench.map(strip) } };
    const parsed = validateSave(v2);
    expect(parsed.ok).toBe(true);
    expect(parsed.save.state).toMatchObject({ phase: "tactics", simulation: null, campaign: null });
    expect(parsed.save.state.cohesionMemory).toEqual({ ...EMPTY_MEMORY, formationKey: "4-3-3", styleKey: "Gegenpress", seasons: 1 });
  });

  it("round-trips a season in progress and resumes it on the same fixture", () => {
    const dataset = makeMiniDataset();
    const reducer = createReducer(dataset);
    let state = reducer(reducer(midCareerState(), { type: "START_SEASON" }), { type: "KICKOFF" });
    for (let i = 0; i < 11; i++) state = reducer(state, { type: "PLAY_MATCH" });
    const text = toSaveText(makeSaveEnvelope(state, { gameVersion: "2.7.0", now: NOW }));
    const parsed = parseSaveText(text);
    expect(parsed.ok).toBe(true);
    expect(describeSave(parsed.save)).toEqual({ season: 3, seasonLabel: "2028-29", phaseLabel: "Match day" });
    const restored = hydrateState(parsed.save.state);
    expect(restored.campaign).toEqual(state.campaign);
    expect(reducer(restored, { type: "PLAY_MATCH" })).toEqual(reducer(state, { type: "PLAY_MATCH" }));

    const damaged = (mutate) => {
      const copy = JSON.parse(text);
      mutate(copy.state);
      return validateSave(copy).ok;
    };
    expect(damaged(() => {})).toBe(true);
    expect(damaged((s) => { s.campaign.seed = -1; })).toBe(false);
    expect(damaged((s) => { s.campaign.week = 13; })).toBe(false);
    expect(damaged((s) => { s.campaign.order[0] = "Nobody FC"; })).toBe(false);
    expect(damaged((s) => { s.campaign.order[1] = s.campaign.order[0]; })).toBe(false);
    expect(damaged((s) => { s.campaign.log[3].gf += 1; })).toBe(false);
    expect(damaged((s) => { s.campaign.log[3].goals.push({ minute: 50, us: false }); s.campaign.log[3].ga += 1; s.campaign.log[3].outcome = s.campaign.log[3].gf > s.campaign.log[3].ga ? "W" : s.campaign.log[3].gf === s.campaign.log[3].ga ? "D" : "L"; })).toBe(true);
    expect(damaged((s) => { s.campaign.log[3].goals.push({ minute: 96, us: false }); s.campaign.log[3].ga += 1; s.campaign.log[3].outcome = s.campaign.log[3].gf > s.campaign.log[3].ga ? "W" : s.campaign.log[3].gf === s.campaign.log[3].ga ? "D" : "L"; })).toBe(false);
    expect(damaged((s) => { s.campaign.log[2].home = !s.campaign.log[2].home; })).toBe(false);
    expect(damaged((s) => { delete s.campaign.log[0].played; })).toBe(false);
    expect(damaged((s) => { s.campaign = null; })).toBe(false);
    expect(damaged((s) => { s.cohesionMemory.matches = -1; })).toBe(false);
  });

  it("rebuilds the memory from the seasons played so far", () => {
    const base = { formationKey: "4-2-3-1", phase: "tactics", simulation: null };
    const history = (...identities) => identities.map((identity) => ({ identity }));
    expect(rememberedSystem({ ...base, seasonHistory: [] })).toEqual(EMPTY_MEMORY);
    expect(rememberedSystem({ ...base, seasonHistory: history("Wing Play", "Gegenpress", "Gegenpress") })).toMatchObject({ formationKey: "4-2-3-1", styleKey: "Gegenpress", seasons: 2 });
    expect(rememberedSystem({ ...base, seasonHistory: history("Gegenpress", null) })).toEqual(EMPTY_MEMORY);
    const playedNotFiled = { ...base, phase: "result", seasonHistory: history("Park The Bus"), simulation: { profile: { synergyLabel: "Park The Bus" } } };
    expect(rememberedSystem(playedNotFiled)).toMatchObject({ formationKey: "4-2-3-1", styleKey: "Park The Bus", seasons: 2 });
  });

  it("resets a draw that was saved mid-spin", () => {
    const state = { ...landedDraftState(), draw: { spinning: true, options: [], redrawsLeft: 1 } };
    const restored = hydrateState(serializeState(state));
    expect(restored.draw).toEqual({ spinning: false, options: [], redrawsLeft: 1 });
    const landed = hydrateState(serializeState(landedDraftState()));
    expect(landed.draw.options.length).toBeGreaterThan(0);
  });
});
