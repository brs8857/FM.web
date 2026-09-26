// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { playCareer, playWholeSeason } from "../fixtures/playCareer.js";
import { createReducer } from "../../src/state/reducer.js";
import { makeInitialState } from "../../src/state/initialState.js";
import { makeSaveEnvelope, toSaveText, parseSaveText, hydrateState, serializeState } from "../../src/state/save.js";
import { STAT_KEYS, RETIREMENT_AGE } from "../../src/engine/players.js";
import { windowBudget, budgetLeft } from "../../src/engine/squad.js";
import { CAREER_SEASONS } from "../../src/engine/season.js";

// Plan C6: ten-season careers on the real archive, past the six a career
// lasts, to catch anything that only goes wrong once players age out,
// budgets repeat and the league has turned over.
const SEASONS = 10;
const dataset = { ...JSON.parse(readFileSync("src/data/players.json", "utf8")), championship: JSON.parse(readFileSync("src/data/championship.json", "utf8")) };
const reducer = createReducer(dataset);

const squad = (state) => [...state.assignments, ...state.bench].map((e) => e.player).filter(Boolean);

function checkSquad(state, label) {
  expect(state.assignments, label).toHaveLength(11);
  expect(state.bench.length, label).toBeLessThanOrEqual(6);
  const ids = squad(state).map((p) => p.id);
  expect(new Set(ids).size, label).toBe(ids.length);
  for (const p of squad(state)) {
    expect(p.ov, `${label}: ${p.name}`).toBeGreaterThanOrEqual(1);
    expect(p.ov, `${label}: ${p.name}`).toBeLessThanOrEqual(99);
    for (const k of STAT_KEYS) expect(p.stats[k] >= 1 && p.stats[k] <= 99, `${label}: ${p.name} ${k}`).toBe(true);
    if (p.age != null) expect(p.age, `${label}: ${p.name}`).toBeLessThan(RETIREMENT_AGE);
  }
}

function checkSeason(state, label) {
  const sim = state.simulation;
  expect(sim.matches, label).toHaveLength(38);
  expect(sim.table, label).toHaveLength(20);
  expect(new Set(sim.table.map((r) => r.name)).size, label).toBe(20);
  const points = sim.table.reduce((sum, r) => sum + r.pts, 0);
  expect(points, label).toBeGreaterThanOrEqual(760);
  expect(points, label).toBeLessThanOrEqual(1140);
  expect(sim.table.reduce((sum, r) => sum + r.w, 0), label).toBe(sim.table.reduce((sum, r) => sum + r.l, 0));
  expect(sim.position >= 1 && sim.position <= 20, label).toBe(true);
  expect(sim.familiarity >= 12 && sim.familiarity <= 96, label).toBe(true);
  for (const k of ["attack", "defense", "buildup", "press", "creativity", "physical"]) {
    expect(sim.profile[k] >= 15 && sim.profile[k] <= 99, `${label}: ${k} ${sim.profile[k]}`).toBe(true);
  }
  expect(sim.profile.defSolidity >= 10 && sim.profile.defSolidity <= 99, label).toBe(true);
  expect(state.opponents, label).toHaveLength(19);
  for (const o of state.opponents) expect(o.ov > 40 && o.ov < 99, `${label}: ${o.name}`).toBe(true);
}

// The window as a careful manager plays it: fill any hole first, then the
// dearest candidate the budget still covers, then try one it cannot.
function playWindow(state, label) {
  const budget = state.transferBudget;
  expect(budget, label).toEqual({ points: windowBudget(state.simulation.position), spent: 0 });
  let s = state;
  for (const hole of s.assignments.filter((a) => !a.player)) {
    const index = s.shortlist.findIndex((e) => !e.signed && e.cost <= budgetLeft(s.transferBudget) && e.player.slot === hole.type);
    if (index >= 0) s = reducer(s, { type: "SIGN_SHORTLIST_TO_XI", index, slotId: hole.slotId });
  }
  const byCost = s.shortlist.map((e, index) => ({ e, index })).filter(({ e }) => !e.signed).sort((a, b) => b.e.cost - a.e.cost);
  const affordable = byCost.find(({ e }) => e.cost <= budgetLeft(s.transferBudget));
  if (affordable) s = reducer(s, { type: "SIGN_SHORTLIST_TO_BENCH", index: affordable.index });
  const tooDear = s.shortlist.findIndex((e) => !e.signed && e.cost > budgetLeft(s.transferBudget));
  if (tooDear >= 0) expect(reducer(s, { type: "SIGN_SHORTLIST_TO_BENCH", index: tooDear }), label).toBe(s);
  expect(s.transferBudget.spent, label).toBeLessThanOrEqual(s.transferBudget.points);
  return s;
}

function soak(seed) {
  let state = playCareer({ reducer, initialState: makeInitialState(dataset, seed), seasons: 1 });
  const log = { retired: [], positions: [state.simulation.position], meanOv: [] };
  checkSeason(state, `seed ${seed} season 1`);
  for (let season = 2; season <= SEASONS; season++) {
    const label = `seed ${seed} season ${season}`;
    state = playWindow(reducer(state, { type: "GOTO_TRANSFER" }), label);
    const before = new Map(squad(state).map((p) => [p.id, p]));
    const rngBefore = state.rngCounter;
    state = reducer(state, { type: "CONTINUE_SEASON" });
    expect(state.season, label).toBe(season);
    expect(state.rngCounter, label).toBeGreaterThan(rngBefore);
    for (const p of squad(state)) {
      const was = before.get(p.id);
      expect(was, `${label}: ${p.name} came from nowhere`).toBeDefined();
      if (was.age != null) expect(p.age, `${label}: ${p.name}`).toBe(was.age + 1);
    }
    const retired = state.lastTransition.retired;
    for (const name of retired) expect([...before.values()].some((p) => p.name === name && p.age >= RETIREMENT_AGE - 1), `${label}: ${name}`).toBe(true);
    log.retired.push(...retired);
    checkSquad(state, label);

    const memory = state.cohesionMemory;
    state = playWholeSeason(reducer, state);
    expect(state.cohesionMemory, label).toEqual({ ...memory, seasons: memory.seasons + 1 });
    checkSeason(state, label);
    log.positions.push(state.simulation.position);
    const xi = state.assignments.map((a) => a.player).filter(Boolean);
    log.meanOv.push(xi.reduce((sum, p) => sum + p.ov, 0) / xi.length);

    if (season <= CAREER_SEASONS) {
      const parsed = parseSaveText(toSaveText(makeSaveEnvelope(state, { gameVersion: "2.5.0" })));
      expect(parsed.ok, label).toBe(true);
      expect(JSON.stringify(serializeState(hydrateState(parsed.save.state))), label).toBe(JSON.stringify(serializeState(state)));
    }
  }
  expect(state.cohesionMemory, `seed ${seed}`).toMatchObject({ styleKey: "Gegenpress", seasons: SEASONS });
  return log;
}

describe("ten-season soak", () => {
  it.each([7, 2025, 90210])("seed %i plays ten seasons without breaking", (seed) => {
    const log = soak(seed);
    expect(log.positions).toHaveLength(SEASONS);
    expect(log.retired.length, "someone retires in ten years").toBeGreaterThan(0);
    for (const ov of log.meanOv) expect(ov > 55 && ov < 95, `mean XI rating ${ov}`).toBe(true);
  });
});
