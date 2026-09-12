import { FORMATIONS } from "../engine/formations.js";
import { careerSeasonLabel, CAREER_SEASONS } from "../engine/season.js";
import { STAT_KEYS } from "../engine/players.js";

export const SAVE_VERSION = 1;
export const APP_ID = "fm-web";
export const SAVE_ERRORS = {
  notFmWeb: "This isn't an FM.WEB save.",
  newer: "Made with a newer FM.WEB. Refresh to update.",
  damaged: "This save file is damaged.",
};

const PHASE_LABELS = {
  formation: "Formation", draft: "Draft", tactics: "Tactics",
  reveal: "Ratings reveal", result: "Season result", transfer: "Transfer window",
};

// migrations[n] upgrades a version-n save to version n+1. Empty in v1.1.
const migrations = {};

export function serializeState(state) {
  return { ...state, draftedIds: [...state.draftedIds] };
}

export function makeSaveEnvelope(state, { gameVersion, now = new Date() }) {
  return { app: APP_ID, saveVersion: SAVE_VERSION, gameVersion, savedAt: now.toISOString(), state: serializeState(state) };
}

export function toSaveText(envelope) {
  return JSON.stringify(envelope);
}

export function parseSaveText(text) {
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, reason: SAVE_ERRORS.notFmWeb };
  }
  return validateSave(value);
}

export function validateSave(value) {
  if (!isObject(value) || value.app !== APP_ID) return { ok: false, reason: SAVE_ERRORS.notFmWeb };
  if (!Number.isInteger(value.saveVersion) || value.saveVersion < 1) return { ok: false, reason: SAVE_ERRORS.damaged };
  if (value.saveVersion > SAVE_VERSION) return { ok: false, reason: SAVE_ERRORS.newer };
  let save = value;
  while (save.saveVersion < SAVE_VERSION) {
    save = migrations[save.saveVersion](save);
  }
  return isValidState(save.state) ? { ok: true, save } : { ok: false, reason: SAVE_ERRORS.damaged };
}

export function hydrateState(saveState) {
  const state = { ...saveState, draftedIds: new Set(saveState.draftedIds) };
  if (state.wheel.spinning) {
    state.wheel = { spinning: false, landed: null };
    state.pool = [];
  }
  return state;
}

export function describeSave(save) {
  const { season, phase } = save.state;
  return { season, seasonLabel: careerSeasonLabel(season), phaseLabel: PHASE_LABELS[phase] };
}

function isObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isUint32(v) {
  return Number.isInteger(v) && v >= 0 && v <= 0xffffffff;
}

function isPlayer(p) {
  return isObject(p)
    && typeof p.id === "string" && typeof p.name === "string" && typeof p.slot === "string"
    && typeof p.nat === "string" && typeof p.seasonKey === "string" && typeof p.ov === "number"
    && (p.age === null || typeof p.age === "number")
    && isObject(p.stats) && STAT_KEYS.every((k) => typeof p.stats[k] === "number");
}

function isPlayerOrNull(p) {
  return p === null || isPlayer(p);
}

function isValidState(s) {
  if (!isObject(s)) return false;
  if (!Object.hasOwn(PHASE_LABELS, s.phase)) return false;
  const formation = FORMATIONS[s.formationKey];
  if (!formation) return false;
  if (!Array.isArray(s.assignments) || s.assignments.length !== 11) return false;
  if (!s.assignments.every((a, i) => isObject(a) && a.slotId === formation.slots[i].id && isPlayerOrNull(a.player) && isObject(a.pos))) return false;
  if (!Array.isArray(s.bench) || s.bench.length > 6 || !s.bench.every((b) => isObject(b) && isPlayerOrNull(b.player))) return false;
  if (!Array.isArray(s.opponents) || s.opponents.length !== 19 || !s.opponents.every((o) => isObject(o) && typeof o.name === "string")) return false;
  if (!Array.isArray(s.draftedIds) || !s.draftedIds.every((id) => typeof id === "string")) return false;
  if (!Array.isArray(s.draftedIdentities)) return false;
  if (!Array.isArray(s.pool) || !s.pool.every(isPlayer)) return false;
  if (!Array.isArray(s.shortlist) || !s.shortlist.every((e) => isObject(e) && isPlayer(e.player))) return false;
  if (!isObject(s.wheel) || !isObject(s.instructions)) return false;
  if (!isUint32(s.careerSeed) || !Number.isInteger(s.rngCounter) || s.rngCounter < 0) return false;
  if (!Number.isInteger(s.season) || s.season < 1 || s.season > CAREER_SEASONS) return false;
  if (!Number.isInteger(s.eraMin) || !Number.isInteger(s.eraMax)) return false;
  if (s.simulation !== null && !(isObject(s.simulation) && Array.isArray(s.simulation.matches) && Array.isArray(s.simulation.table))) return false;
  return true;
}
