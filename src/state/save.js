import { FORMATIONS } from "../engine/formations.js";
import { careerSeasonLabel, CAREER_SEASONS, SEASON_WEEKS, buildUserFixtureList } from "../engine/season.js";
import { STAT_KEYS } from "../engine/players.js";
import { EMPTY_MEMORY } from "../engine/familiarity.js";
import { wageCost, windowBudget } from "../engine/squad.js";
import { STYLE_PRESETS } from "../engine/instructions.js";
import { REDRAWS } from "./initialState.js";
import legacyClubIds from "../data/legacyClubIds.json";
import { PRODUCT_NAME } from "../content/product.js";

export const SAVE_VERSION = 4;
export const APP_ID = "fm-web"; // the envelope id from 1.1.0, kept so old saves load
export const SAVE_ERRORS = {
  notFmWeb: `This isn't an ${PRODUCT_NAME} save.`,
  newer: `Made with a newer ${PRODUCT_NAME}. Refresh to update.`,
  damaged: "This save file is damaged.",
};

const PHASE_LABELS = {
  formation: "Formation", draft: "Draft", tactics: "Tactics",
  reveal: "Ratings reveal", matchday: "Match day", result: "Season result", transfer: "Transfer window",
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
  // v2 (2.0.0): nobody aged, no system was remembered, the window was free.
  // Ages stand as recorded and start moving next summer; the memory is the
  // run of seasons in the latest named identity (an unnamed one left no
  // record of which it was, so it starts afresh); an open window gets what
  // its finish earns, less the cost of anyone already signed.
  2(save) {
    const s = save.state;
    const aged = (e) => (isObject(e) && isObject(e.player) ? { ...e, player: { ...e.player, age: typeof e.player.age === "number" ? e.player.age : null } } : e);
    const shortlist = Array.isArray(s.shortlist) ? s.shortlist.map((e) => (isObject(e) && isObject(e.player) ? { ...aged(e), cost: wageCost(e.player) } : e)) : s.shortlist;
    let transferBudget = null;
    if (s.phase === "transfer" && Array.isArray(shortlist)) {
      const points = windowBudget(s.simulation?.position ?? 20);
      const signed = shortlist.filter((e) => e?.signed).reduce((sum, e) => sum + e.cost, 0);
      transferBudget = { points, spent: Math.min(points, signed) };
    }
    const state = {
      ...s,
      assignments: Array.isArray(s.assignments) ? s.assignments.map(aged) : s.assignments,
      bench: Array.isArray(s.bench) ? s.bench.map(aged) : s.bench,
      shortlist,
      transferBudget,
      cohesionMemory: rememberedSystem(s),
    };
    return { ...save, saveVersion: 3, state };
  },
  // v3 (2.5.0): a season was simulated whole at kick-off. Seasons already
  // recorded have no match log. A season revealed but not yet seen restarts
  // from kick-off (its results will be drawn afresh, fixture by fixture), so
  // the seasons memory it had already counted is given back; a season on its
  // back page keeps its results, without scorers.
  3(save) {
    const s = save.state;
    const reveal = s.phase === "reveal";
    let memory = isObject(s.cohesionMemory) ? s.cohesionMemory : { ...EMPTY_MEMORY };
    if (reveal) memory = memory.seasons > 1 ? { ...memory, seasons: memory.seasons - 1 } : rememberedSystem({ ...s, phase: "tactics" });
    const state = {
      ...s,
      phase: reveal ? "tactics" : s.phase,
      simulation: reveal ? null : s.simulation,
      campaign: null,
      discipline: {},
      cohesionMemory: { ...memory, signature: null, matches: 0 },
      seasonHistory: Array.isArray(s.seasonHistory) ? s.seasonHistory.map((h) => (isObject(h) ? { ...h, matches: [], topScorer: null } : h)) : s.seasonHistory,
    };
    return { ...save, saveVersion: 4, state };
  },
};

export function rememberedSystem(state) {
  const played = Array.isArray(state.seasonHistory) ? state.seasonHistory.map((h) => h?.identity ?? null) : [];
  if ((state.phase === "reveal" || state.phase === "result") && isObject(state.simulation)) played.push(state.simulation.profile?.synergyLabel ?? null);
  const last = played.at(-1);
  if (!last) return { ...EMPTY_MEMORY };
  let seasons = 0;
  while (seasons < played.length && played[played.length - 1 - seasons] === last) seasons++;
  return { ...EMPTY_MEMORY, formationKey: state.formationKey, styleKey: last, seasons };
}

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

function isGoal(g) {
  return isObject(g) && Number.isInteger(g.minute) && g.minute >= 1 && g.minute <= 95
    && (g.us === false || (g.us === true && typeof g.slotId === "string" && typeof g.name === "string"));
}

function isCard(c) {
  return isObject(c) && Number.isInteger(c.minute) && c.minute >= 1 && c.minute <= 95
    && typeof c.slotId === "string" && typeof c.name === "string" && (c.kind === "yellow" || c.kind === "red");
}

function isDiscipline(d) {
  return isObject(d) && Object.values(d).every((e) => isObject(e) && Number.isInteger(e.yellows) && e.yellows >= 0 && e.yellows < 5
    && Number.isInteger(e.banned) && e.banned >= 0);
}

function isMatchEntry(m, week) {
  if (!isObject(m) || m.week !== week || typeof m.opponent !== "string" || typeof m.home !== "boolean") return false;
  if (!Number.isInteger(m.gf) || !Number.isInteger(m.ga) || m.gf < 0 || m.ga < 0) return false;
  if (m.outcome !== (m.gf > m.ga ? "W" : m.gf === m.ga ? "D" : "L")) return false;
  if (!Array.isArray(m.goals) || m.goals.length !== m.gf + m.ga || !m.goals.every(isGoal)) return false;
  if (m.goals.filter((g) => g.us).length !== m.gf) return false;
  if (!Array.isArray(m.cards) || !m.cards.every(isCard) || !isStringArray(m.bans)) return false;
  return isObject(m.played) && Number.isInteger(m.played.cohesion) && typeof m.played.changed === "boolean";
}

function isMatchLog(log) {
  return Array.isArray(log) && log.every((m, i) => isMatchEntry(m, i + 1));
}

function isSeasonSummary(s) {
  return isObject(s) && Number.isInteger(s.season) && s.season >= 1 && s.season <= CAREER_SEASONS
    && Number.isInteger(s.position) && ["pts", "w", "d", "l", "gf", "ga", "familiarity"].every((k) => Number.isInteger(s[k]))
    && typeof s.tier === "string" && (s.identity === null || typeof s.identity === "string") && isUint32(s.seed)
    && isMatchLog(s.matches) && (s.matches.length === 0 || s.matches.length === SEASON_WEEKS)
    && (s.topScorer === null || (isObject(s.topScorer) && typeof s.topScorer.name === "string" && Number.isInteger(s.topScorer.goals)));
}

function isMemory(m) {
  return isObject(m) && (m.formationKey === null || typeof m.formationKey === "string")
    && (m.styleKey === null || typeof m.styleKey === "string") && Number.isInteger(m.seasons) && m.seasons >= 0
    && (m.signature === null || typeof m.signature === "string") && Number.isInteger(m.matches) && m.matches >= 0;
}

// The season in progress: its seed, the rivals in draw order (the same
// nineteen the league holds), the next week, and a log of every fixture
// played so far, in the order the fixture list has them.
function isCampaign(c, opponents) {
  if (!isObject(c) || !isUint32(c.seed) || !Number.isInteger(c.week) || c.week < 1 || c.week > SEASON_WEEKS + 1) return false;
  if (!isStringArray(c.order) || c.order.length !== 19 || new Set(c.order).size !== 19) return false;
  const names = new Set(opponents.map((o) => o.name));
  if (!c.order.every((name) => names.has(name))) return false;
  if (!isMatchLog(c.log) || c.log.length !== c.week - 1) return false;
  const fixtures = buildUserFixtureList(c.order);
  return c.log.every((m, i) => m.opponent === fixtures[i].name && m.home === fixtures[i].home);
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
  if (!Array.isArray(s.shortlist) || !s.shortlist.every((e) => isObject(e) && isPlayer(e.player) && Number.isInteger(e.cost))) return false;
  if (s.transferBudget !== null && !(isObject(s.transferBudget) && Number.isInteger(s.transferBudget.points) && Number.isInteger(s.transferBudget.spent))) return false;
  if (!isMemory(s.cohesionMemory)) return false;
  if (!isObject(s.instructions)) return false;
  if (!isUint32(s.careerSeed) || !Number.isInteger(s.rngCounter) || s.rngCounter < 0) return false;
  if (!Number.isInteger(s.season) || s.season < 1 || s.season > CAREER_SEASONS) return false;
  if (!Number.isInteger(s.eraMin) || !Number.isInteger(s.eraMax)) return false;
  if (s.simulation !== null && !(isObject(s.simulation) && Array.isArray(s.simulation.matches) && Array.isArray(s.simulation.table))) return false;
  if (s.campaign !== null && !isCampaign(s.campaign, s.opponents)) return false;
  if (!isDiscipline(s.discipline)) return false;
  if ((s.phase === "reveal" || s.phase === "matchday") && s.campaign === null) return false;
  if (s.phase === "matchday" && s.campaign.week > SEASON_WEEKS) return false;
  if (s.phase === "result" && s.simulation === null) return false;
  return true;
}
