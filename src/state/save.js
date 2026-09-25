import { FORMATIONS } from "../engine/formations.js";
import { careerSeasonLabel, CAREER_SEASONS } from "../engine/season.js";
import { STAT_KEYS } from "../engine/players.js";
import { STYLE_PRESETS } from "../engine/instructions.js";
import { REDRAWS } from "./initialState.js";
import legacyClubIds from "../data/legacyClubIds.json";
import { PRODUCT_NAME } from "../content/product.js";

export const SAVE_VERSION = 2;
export const APP_ID = "fm-web"; // the envelope id from 1.1.0, kept so old saves load
export const SAVE_ERRORS = {
  notFmWeb: `This isn't an ${PRODUCT_NAME} save.`,
  newer: `Made with a newer ${PRODUCT_NAME}. Refresh to update.`,
  damaged: "This save file is damaged.",
};

const PHASE_LABELS = {
  formation: "Formation", draft: "Draft", tactics: "Tactics",
  reveal: "Ratings reveal", result: "Season result", transfer: "Transfer window",
};

// 1.1.0 keyed club-seasons by Transfermarkt's numeric club ids; v2 uses slugs
// (plan B10). Season keys, player ids and drafted ids all carry the club id.
export function rekeySeasonKey(seasonKey) {
  const [year, clubId] = String(seasonKey).split("_");
  return `${year}_${legacyClubIds[clubId] ?? clubId}`;
}

function rekeyPlayer(player) {
  if (!isObject(player) || typeof player.seasonKey !== "string") return player;
  const seasonKey = rekeySeasonKey(player.seasonKey);
  const id = typeof player.id === "string" && player.id.startsWith(`${player.seasonKey}__`) ? seasonKey + player.id.slice(player.seasonKey.length) : player.id;
  return { ...player, id, seasonKey };
}

function rekeyId(id) {
  const sep = typeof id === "string" ? id.indexOf("__") : -1;
  return sep > 0 ? rekeySeasonKey(id.slice(0, sep)) + id.slice(sep) : id;
}

export function rekeyState(state) {
  const entry = (e) => (isObject(e) ? { ...e, player: rekeyPlayer(e.player) } : e);
  return {
    ...state,
    assignments: Array.isArray(state.assignments) ? state.assignments.map(entry) : state.assignments,
    bench: Array.isArray(state.bench) ? state.bench.map(entry) : state.bench,
    shortlist: Array.isArray(state.shortlist) ? state.shortlist.map(entry) : state.shortlist,
    draftedIds: Array.isArray(state.draftedIds) ? state.draftedIds.map(rekeyId) : state.draftedIds,
    draw: isObject(state.draw) && Array.isArray(state.draw.options)
      ? { ...state.draw, options: state.draw.options.map((o) => (isObject(o) ? { ...o, clubId: legacyClubIds[o.clubId] ?? o.clubId, players: Array.isArray(o.players) ? o.players.map(rekeyPlayer) : o.players } : o)) }
      : state.draw,
  };
}

// migrations[n] upgrades a version-n save to version n+1.
const migrations = {
  // v1 (1.1.0): the wheel and its pool become a one-option draw; the record
  // starts empty; club ids become slugs.
  1(save) {
    const { wheel, pool, poolRelaxed, ...rest } = save.state;
    const landed = wheel?.landed;
    const options = landed && Array.isArray(pool) && pool.length > 0
      ? [{ year: String(landed.year), clubId: String(landed.clubId), label: landed.label, players: pool, relaxed: Boolean(poolRelaxed) }]
      : [];
    const state = rekeyState({ ...rest, draw: { spinning: false, options, redrawsLeft: REDRAWS }, seasonHistory: [] });
    return { ...save, saveVersion: 2, state };
  },
};

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
    if (!isObject(save.state)) return { ok: false, reason: SAVE_ERRORS.damaged };
    save = migrations[save.saveVersion](save);
  }
  return isValidState(save.state) ? { ok: true, save } : { ok: false, reason: SAVE_ERRORS.damaged };
}

export function hydrateState(saveState) {
  const state = { ...saveState, draftedIds: new Set(saveState.draftedIds) };
  if (state.draw.spinning) state.draw = { ...state.draw, spinning: false, options: [] };
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

function isStringArray(v) {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function isDrawOption(o) {
  return isObject(o) && typeof o.year === "string" && typeof o.clubId === "string" && typeof o.label === "string"
    && typeof o.relaxed === "boolean" && Array.isArray(o.players) && o.players.length > 0 && o.players.every(isPlayer);
}

function isDraw(d) {
  return isObject(d) && typeof d.spinning === "boolean"
    && Number.isInteger(d.redrawsLeft) && d.redrawsLeft >= 0 && d.redrawsLeft <= REDRAWS
    && Array.isArray(d.options) && d.options.every(isDrawOption);
}

function isSeasonSummary(s) {
  return isObject(s) && Number.isInteger(s.season) && s.season >= 1 && s.season <= CAREER_SEASONS
    && Number.isInteger(s.position) && ["pts", "w", "d", "l", "gf", "ga", "familiarity"].every((k) => Number.isInteger(s[k]))
    && typeof s.tier === "string" && (s.identity === null || typeof s.identity === "string") && isUint32(s.seed);
}

function isValidState(s) {
  if (!isObject(s)) return false;
  if (!Object.hasOwn(PHASE_LABELS, s.phase)) return false;
  if (typeof s.draftDone !== "boolean") return false;
  if (s.selectedStyle !== null && !STYLE_PRESETS.some((p) => p.key === s.selectedStyle)) return false;
  if (s.lastTransition !== null && !(isObject(s.lastTransition) && isStringArray(s.lastTransition.relegated) && isStringArray(s.lastTransition.promoted)
    && (s.lastTransition.retired === undefined || isStringArray(s.lastTransition.retired)))) return false;
  const formation = FORMATIONS[s.formationKey];
  if (!formation) return false;
  if (!Array.isArray(s.assignments) || s.assignments.length !== 11) return false;
  if (!s.assignments.every((a, i) => isObject(a) && a.slotId === formation.slots[i].id && isPlayerOrNull(a.player) && isObject(a.pos))) return false;
  if (!Array.isArray(s.bench) || s.bench.length > 6 || !s.bench.every((b) => isObject(b) && isPlayerOrNull(b.player))) return false;
  if (!Array.isArray(s.opponents) || s.opponents.length !== 19 || !s.opponents.every((o) => isObject(o) && typeof o.name === "string")) return false;
  if (!Array.isArray(s.draftedIds) || !s.draftedIds.every((id) => typeof id === "string")) return false;
  if (!Array.isArray(s.draftedIdentities)) return false;
  if (!isDraw(s.draw)) return false;
  if (!Array.isArray(s.seasonHistory) || !s.seasonHistory.every(isSeasonSummary)) return false;
  if (!Array.isArray(s.shortlist) || !s.shortlist.every((e) => isObject(e) && isPlayer(e.player) && (e.cost === undefined || Number.isInteger(e.cost)))) return false;
  if (s.transferBudget !== undefined && s.transferBudget !== null && !(isObject(s.transferBudget) && Number.isInteger(s.transferBudget.points) && Number.isInteger(s.transferBudget.spent))) return false;
  if (!isObject(s.instructions)) return false;
  if (!isUint32(s.careerSeed) || !Number.isInteger(s.rngCounter) || s.rngCounter < 0) return false;
  if (!Number.isInteger(s.season) || s.season < 1 || s.season > CAREER_SEASONS) return false;
  if (!Number.isInteger(s.eraMin) || !Number.isInteger(s.eraMax)) return false;
  if (s.simulation !== null && !(isObject(s.simulation) && Array.isArray(s.simulation.matches) && Array.isArray(s.simulation.table))) return false;
  return true;
}
