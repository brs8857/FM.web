import { clamp } from "../engine/util.js";
import { FORMATIONS, makeInitialAssignments } from "../engine/formations.js";
import { ROLES, defaultRoleFor, defaultDutyFor } from "../engine/roles.js";
import { STYLE_PRESETS } from "../engine/instructions.js";
import { createSquadLookup, buildPool } from "../engine/players.js";
import { computeTeamProfile } from "../engine/tactics.js";
import { computeFamiliarity } from "../engine/familiarity.js";
import { simulateSeason } from "../engine/season.js";
import { applyPromotionRelegation } from "../engine/league.js";
import { nextEmptySlotIndex, autoFillBench, generateShortlist, signToSlot, signToBench } from "../engine/squad.js";
import { createRng } from "../engine/rng.js";
import { makeInitialState } from "./initialState.js";

// Temporary until Task 12 stores a career seed in state.
function freshRng() {
  return createRng(crypto.getRandomValues(new Uint32Array(1))[0]);
}

export function createReducer(dataset) {
  const getSquad = createSquadLookup(dataset);

  return function reducer(state, action) {
    switch (action.type) {
      case "SET_FORMATION": {
        return { ...makeInitialState(dataset), formationKey: action.key, assignments: makeInitialAssignments(action.key), eraMin: state.eraMin, eraMax: state.eraMax };
      }
      case "SET_ERA": {
        return { ...state, eraMin: action.min, eraMax: action.max };
      }
      case "START_DRAFT": {
        return { ...state, phase: "draft" };
      }
      case "SPIN": {
        return { ...state, wheel: { spinning: true, landed: null }, pool: [] };
      }
      case "LAND": {
        const idx = nextEmptySlotIndex(state.assignments);
        let slotType = "GK", side = null;
        if (idx >= 0) { slotType = state.assignments[idx].type; side = state.assignments[idx].side; }
        const pool = buildPool(getSquad, action.year, action.clubId, slotType, side, state.draftedIds);
        return { ...state, wheel: { spinning: false, landed: action }, pool };
      }
      case "PICK_PLAYER": {
        const idx = nextEmptySlotIndex(state.assignments);
        if (idx < 0) return state;
        const draftedIds = new Set(state.draftedIds);
        draftedIds.add(action.player.id);
        const role = defaultRoleFor(state.assignments[idx].type);
        const duty = defaultDutyFor(role);
        const assignments = state.assignments.slice();
        assignments[idx] = { ...assignments[idx], player: action.player, role: role.key, duty };
        const draftDone = nextEmptySlotIndex(assignments) === -1;
        if (draftDone) {
          const { bench, draftedIds: withBench } = autoFillBench(getSquad, assignments, draftedIds);
          return { ...state, assignments, draftedIds: withBench, wheel: { spinning: false, landed: null }, pool: [], draftDone, bench };
        }
        return { ...state, assignments, draftedIds, wheel: { spinning: false, landed: null }, pool: [], draftDone };
      }
      case "SKIP_TO_TACTICS": {
        return { ...state, phase: "tactics", wheel: { spinning: false, landed: null }, pool: [] };
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
        const assignmentsWithRole = state.assignments.map((a) => ({
          ...a,
          roleObj: ROLES[a.type].find((r) => r.key === a.role),
        })).map((a) => ({ ...a, role: a.roleObj }));
        const familiarity = computeFamiliarity(assignmentsWithRole, state.instructions, state.formationKey);
        const profile = computeTeamProfile(assignmentsWithRole, state.instructions, familiarity);
        const simulation = simulateSeason(profile, familiarity, state.opponents, freshRng());
        // Ratings stay hidden through the draft and tactics phases — this is
        // the moment they're finally revealed, right before a ball is kicked.
        return { ...state, phase: "reveal", simulation: { ...simulation, profile, familiarity, instructions: state.instructions, season: state.season } };
      }
      case "KICKOFF": {
        return { ...state, phase: "result" };
      }
      case "GOTO_TRANSFER": {
        const rng = freshRng();
        const shortlist = generateShortlist(getSquad, dataset.index, { eraMin: state.eraMin, eraMax: state.eraMax }, state.draftedIds, rng)
          .map((player) => ({ player, signed: false }));
        const { opponents, relegated, promoted } = applyPromotionRelegation(state.opponents, state.simulation?.table, dataset.championship, rng);
        return { ...state, phase: "transfer", shortlist, opponents, lastTransition: { relegated, promoted } };
      }
      case "SIGN_SHORTLIST_TO_BENCH": {
        const entry = state.shortlist[action.index];
        if (!entry || entry.signed) return state;
        const bench = signToBench(state.bench, entry.player);
        const draftedIds = new Set(state.draftedIds); draftedIds.add(entry.player.id);
        const shortlist = state.shortlist.map((s, i) => i === action.index ? { ...s, signed: true } : s);
        return { ...state, bench, draftedIds, shortlist };
      }
      case "SIGN_SHORTLIST_TO_XI": {
        const entry = state.shortlist[action.index];
        if (!entry || entry.signed) return state;
        const { assignments, bench } = signToSlot(state.assignments, state.bench, action.slotId, entry.player);
        const draftedIds = new Set(state.draftedIds); draftedIds.add(entry.player.id);
        const shortlist = state.shortlist.map((s, i) => i === action.index ? { ...s, signed: true } : s);
        return { ...state, assignments, bench, draftedIds, shortlist };
      }
      case "CONTINUE_SEASON": {
        return { ...state, phase: "tactics", season: state.season + 1, shortlist: [], simulation: null };
      }
      case "RESET": {
        return makeInitialState(dataset);
      }
      default: return state;
    }
  };
}
