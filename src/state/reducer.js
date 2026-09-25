import { clamp } from "../engine/util.js";
import { FORMATIONS, makeInitialAssignments } from "../engine/formations.js";
import { ROLES, defaultRoleFor, defaultDutyFor } from "../engine/roles.js";
import { STYLE_PRESETS } from "../engine/instructions.js";
import { createSquadLookup, buildPool } from "../engine/players.js";
import { computeTeamProfile } from "../engine/tactics.js";
import { computeFamiliarity } from "../engine/familiarity.js";
import { simulateSeason } from "../engine/season.js";
import { applyPromotionRelegation } from "../engine/league.js";
import { nextEmptySlotIndex, autoFillBench, generateShortlist, signToSlot, signToBench, progressSquad } from "../engine/squad.js";
import { playerIdentity } from "../engine/identity.js";
import { makeInitialState, DRAW_OPTIONS } from "./initialState.js";
import { takeRng } from "./rngState.js";
import { selectEraIndex } from "./selectors.js";

const idleDraw = (draw) => ({ ...draw, spinning: false, options: [] });

export function summarizeSeason(state) {
  const { simulation: s, season, careerSeed } = state;
  return {
    season, position: s.position, pts: s.pts, w: s.w, d: s.d, l: s.l, gf: s.gf, ga: s.ga,
    tier: s.tier.name, identity: s.profile.synergyLabel, familiarity: s.familiarity, seed: careerSeed,
  };
}

export function createReducer(dataset) {
  const getSquad = createSquadLookup(dataset);

  // Draws up to three distinct club-seasons from the era, each with the
  // players it can offer for the next empty slot. Squads with nobody left
  // are passed over so a draw is never a dead end.
  function land(state) {
    const eraIndex = selectEraIndex(dataset.index, state.eraMin, state.eraMax);
    if (eraIndex.length === 0) return state;
    const [rng, next] = takeRng(state);
    const idx = nextEmptySlotIndex(state.assignments);
    let slotType = "GK", side = null;
    if (idx >= 0) { slotType = state.assignments[idx].type; side = state.assignments[idx].side; }
    const want = Math.min(DRAW_OPTIONS, eraIndex.length);
    const seen = new Set();
    const options = [];
    for (let tries = 0; options.length < want && seen.size < eraIndex.length && tries < eraIndex.length * 4; tries++) {
      const entry = rng.pick(eraIndex);
      const key = `${entry.y}_${entry.c}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const { players, relaxed } = buildPool(getSquad, entry.y, entry.c, slotType, side, state.draftedIds, state.draftedIdentities);
      if (players.length === 0) continue;
      options.push({ year: entry.y, clubId: entry.c, label: entry.label, players, relaxed });
    }
    return { ...next, draw: { ...state.draw, spinning: false, options } };
  }

  return function reducer(state, action) {
    switch (action.type) {
      case "SET_FORMATION": {
        return {
          ...makeInitialState(dataset, state.careerSeed),
          rngCounter: state.rngCounter,
          formationKey: action.key,
          assignments: makeInitialAssignments(action.key),
          eraMin: state.eraMin,
          eraMax: state.eraMax,
        };
      }
      case "SET_ERA": {
        return { ...state, eraMin: action.min, eraMax: action.max };
      }
      case "START_DRAFT": {
        return { ...state, phase: "draft" };
      }
      case "DRAW": {
        if (state.draftDone || state.draw.options.length > 0) return state;
        return { ...state, draw: { ...state.draw, spinning: true, options: [] } };
      }
      case "LAND": {
        if (state.draftDone) return state;
        return land(state);
      }
      case "REDRAW": {
        if (state.draftDone || state.draw.redrawsLeft <= 0 || state.draw.options.length === 0) return state;
        return land({ ...state, draw: { ...state.draw, redrawsLeft: state.draw.redrawsLeft - 1 } });
      }
      case "PICK_PLAYER": {
        const idx = nextEmptySlotIndex(state.assignments);
        if (idx < 0) return state;
        const draftedIds = new Set(state.draftedIds);
        draftedIds.add(action.player.id);
        const draftedIdentities = [...state.draftedIdentities, playerIdentity(action.player)];
        const role = defaultRoleFor(state.assignments[idx].type);
        const duty = defaultDutyFor(role);
        const assignments = state.assignments.slice();
        assignments[idx] = { ...assignments[idx], player: action.player, role: role.key, duty };
        const draftDone = nextEmptySlotIndex(assignments) === -1;
        if (draftDone) {
          const { bench, draftedIds: withBench } = autoFillBench(getSquad, assignments, draftedIds, draftedIdentities);
          return {
            ...state, assignments, draftedIds: withBench,
            draftedIdentities: [...draftedIdentities, ...bench.map((b) => playerIdentity(b.player))],
            draw: idleDraw(state.draw), draftDone, bench,
          };
        }
        return { ...state, assignments, draftedIds, draftedIdentities, draw: idleDraw(state.draw), draftDone };
      }
      case "SKIP_TO_TACTICS": {
        return { ...state, phase: "tactics", draw: idleDraw(state.draw) };
      }
      case "SET_ROLE": {
        const assignments = state.assignments.map((a) => {
          if (a.slotId !== action.slotId) return a;
          const role = ROLES[a.type].find((r) => r.key === action.roleKey);
          const duty = role.duties.includes(a.duty) ? a.duty : defaultDutyFor(role);
          return { ...a, role: role.key, duty };
        });
        return { ...state, assignments };
      }
      case "SET_DUTY": {
        const assignments = state.assignments.map((a) => a.slotId === action.slotId ? { ...a, duty: action.duty } : a);
        return { ...state, assignments };
      }
      case "SET_SLIDER": {
        const assignments = state.assignments.map((a) => a.slotId === action.slotId ? { ...a, [action.key]: action.value } : a);
        return { ...state, assignments };
      }
      case "SET_INSTRUCTION": {
        return { ...state, instructions: { ...state.instructions, [action.key]: action.value } };
      }
      case "SET_STYLE": {
        const preset = STYLE_PRESETS.find((s) => s.key === action.key);
        if (!preset) return state;
        return { ...state, instructions: { ...preset.instructions }, selectedStyle: preset.key };
      }
      case "MOVE_PLAYER": {
        // Literal free positioning: drag a slot's marker to any point on the pitch.
        // The player standing there moves with it; nobody else is affected. This is
        // the main lever for hand-crafting exactly how the team lines up.
        const x = clamp(action.x, 3, 97), y = clamp(action.y, 5, 95);
        const assignments = state.assignments.map((a) => a.slotId === action.slotId ? { ...a, pos: { x, y } } : a);
        return { ...state, assignments };
      }
      case "RESET_POSITIONS": {
        const template = FORMATIONS[state.formationKey].slots;
        const assignments = state.assignments.map((a) => {
          const t = template.find((s) => s.id === a.slotId);
          return t ? { ...a, pos: { x: t.x, y: t.y } } : a;
        });
        return { ...state, assignments };
      }
      case "SWAP_PLAYERS": {
        // Drag-and-drop repositioning on the tactics pitch: swap the players (and
        // bench entries) sitting in two slots/bench-spots. Each player keeps their
        // stats, but role/duty/sliders reset to sensible defaults for their new
        // slot's position category, since e.g. a striker's role list doesn't apply
        // to a full-back slot.
        const { fromKind, fromId, toKind, toId } = action;
        if (fromKind === "slot" && toKind === "slot") {
          if (fromId === toId) return state;
          const assignments = state.assignments.map((a) => ({ ...a }));
          const fromA = assignments.find((a) => a.slotId === fromId);
          const toA = assignments.find((a) => a.slotId === toId);
          const fromPlayer = fromA.player, toPlayer = toA.player;
          const resetFor = (type, player) => {
            if (!player) return { player: null, role: null, duty: null, sliderAtt: 50, sliderDef: 50 };
            const role = defaultRoleFor(type);
            return { player, role: role.key, duty: defaultDutyFor(role), sliderAtt: 50, sliderDef: 50 };
          };
          Object.assign(fromA, resetFor(fromA.type, toPlayer));
          Object.assign(toA, resetFor(toA.type, fromPlayer));
          return { ...state, assignments };
        }
        if (fromKind === "bench" && toKind === "slot") {
          const assignments = state.assignments.map((a) => ({ ...a }));
          const bench = state.bench.map((b) => ({ ...b }));
          const toA = assignments.find((a) => a.slotId === toId);
          const benchEntry = bench[fromId];
          const outgoingPlayer = toA.player;
          const role = defaultRoleFor(toA.type);
          Object.assign(toA, { player: benchEntry.player, role: role.key, duty: defaultDutyFor(role), sliderAtt: 50, sliderDef: 50 });
          bench[fromId] = { player: outgoingPlayer, role: null, duty: null };
          return { ...state, assignments, bench };
        }
        if (fromKind === "slot" && toKind === "bench") {
          const assignments = state.assignments.map((a) => ({ ...a }));
          const bench = state.bench.map((b) => ({ ...b }));
          const fromA = assignments.find((a) => a.slotId === fromId);
          const benchEntry = bench[toId];
          const outgoingPlayer = fromA.player;
          const role = defaultRoleFor(fromA.type);
          Object.assign(fromA, { player: benchEntry.player, role: benchEntry.player ? role.key : null, duty: benchEntry.player ? defaultDutyFor(role) : null, sliderAtt: 50, sliderDef: 50 });
          bench[toId] = { player: outgoingPlayer, role: null, duty: null };
          return { ...state, assignments, bench };
        }
        return state;
      }
      case "SIMULATE": {
        const [rng, next] = takeRng(state);
        const assignmentsWithRole = state.assignments.map((a) => ({
          ...a,
          roleObj: ROLES[a.type].find((r) => r.key === a.role),
        })).map((a) => ({ ...a, role: a.roleObj }));
        const familiarity = computeFamiliarity(assignmentsWithRole, state.instructions, state.formationKey);
        const profile = computeTeamProfile(assignmentsWithRole, state.instructions, familiarity);
        const simulation = simulateSeason(profile, familiarity, state.opponents, rng);
        // Ratings stay hidden through the draft and tactics phases — this is
        // the moment they're finally revealed, right before a ball is kicked.
        return { ...next, phase: "reveal", simulation: { ...simulation, profile, familiarity, instructions: state.instructions, season: state.season } };
      }
      case "KICKOFF": {
        return { ...state, phase: "result" };
      }
      case "GOTO_TRANSFER": {
        const [rng, next] = takeRng(state);
        const shortlist = generateShortlist(getSquad, dataset.index, { eraMin: state.eraMin, eraMax: state.eraMax }, state.draftedIds, rng, { ownedIdentities: state.draftedIdentities })
          .map((player) => ({ player, signed: false }));
        const { opponents, relegated, promoted } = applyPromotionRelegation(state.opponents, state.simulation?.table, dataset.championship, rng);
        const seasonHistory = state.simulation ? [...state.seasonHistory, summarizeSeason(state)] : state.seasonHistory;
        return { ...next, phase: "transfer", shortlist, opponents, lastTransition: { relegated, promoted }, seasonHistory };
      }
      case "SIGN_SHORTLIST_TO_BENCH": {
        const entry = state.shortlist[action.index];
        if (!entry || entry.signed) return state;
        const bench = signToBench(state.bench, entry.player);
        const draftedIds = new Set(state.draftedIds); draftedIds.add(entry.player.id);
        const draftedIdentities = [...state.draftedIdentities, playerIdentity(entry.player)];
        const shortlist = state.shortlist.map((s, i) => i === action.index ? { ...s, signed: true } : s);
        return { ...state, bench, draftedIds, draftedIdentities, shortlist };
      }
      case "SIGN_SHORTLIST_TO_XI": {
        const entry = state.shortlist[action.index];
        if (!entry || entry.signed) return state;
        const { assignments, bench } = signToSlot(state.assignments, state.bench, action.slotId, entry.player);
        const draftedIds = new Set(state.draftedIds); draftedIds.add(entry.player.id);
        const draftedIdentities = [...state.draftedIdentities, playerIdentity(entry.player)];
        const shortlist = state.shortlist.map((s, i) => i === action.index ? { ...s, signed: true } : s);
        return { ...state, assignments, bench, draftedIds, draftedIdentities, shortlist };
      }
      case "CONTINUE_SEASON": {
        const [rng, next] = takeRng(state);
        const { assignments, bench, retired } = progressSquad(state.assignments, state.bench, rng);
        const lastTransition = { relegated: [], promoted: [], ...state.lastTransition, retired };
        return { ...next, phase: "tactics", season: state.season + 1, shortlist: [], simulation: null, assignments, bench, lastTransition };
      }
      case "NEW_GAME": {
        return makeInitialState(dataset, action.seed);
      }
      case "LOAD_SAVE": {
        return action.state;
      }
      default: return state;
    }
  };
}
