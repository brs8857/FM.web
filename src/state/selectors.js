import { ROLES } from "../engine/roles.js";
import { DEFAULT_INSTRUCTIONS } from "../engine/instructions.js";
import { computeFamiliarity } from "../engine/familiarity.js";
import { computeTeamProfile } from "../engine/tactics.js";
import { CAREER_SEASONS } from "../engine/season.js";
import { nextEmptySlotIndex } from "../engine/squad.js";

export function selectEraIndex(index, eraMin, eraMax) {
  return index.filter((e) => {
    const y = parseInt(e.y, 10);
    return y >= eraMin && y <= eraMax;
  });
}

export function liveAssignments(assignments) {
  return assignments.map((a) => ({
    ...a,
    role: a.role ? (ROLES[a.type].find((r) => r.key === a.role) || null) : null,
  }));
}

export function selectFamiliarity(live, instructions, formationKey) {
  return computeFamiliarity(live, instructions, formationKey);
}

export function selectProfile(live, instructions, familiarity) {
  return computeTeamProfile(live, instructions, familiarity);
}

function tacticUntouched(state) {
  return state.selectedStyle === null
    && Object.keys(DEFAULT_INSTRUCTIONS).every((k) => state.instructions[k] === DEFAULT_INSTRUCTIONS[k]);
}

// The one action that moves the career on (spec 04 §4.2). `tab` is the Club
// tab that holds it; null while the career is still being set up.
export function selectNextAction(state) {
  const { phase, season } = state;
  switch (phase) {
    case "formation":
      return { key: "startDraft", label: "Start the draft", tab: null };
    case "draft": {
      if (state.draftDone) return { key: "goToBoard", label: "Go to the board", tab: null };
      const filled = state.assignments.filter((a) => a.player).length;
      const pick = Math.min(11, filled + 1);
      const idx = nextEmptySlotIndex(state.assignments);
      return { key: "draft", label: `Draft in progress: pick ${pick} of 11`, tab: null, pick, slotId: idx >= 0 ? state.assignments[idx].slotId : null };
    }
    case "tactics":
      if (tacticUntouched(state)) return { key: "setTactic", label: "Set your tactic", tab: "board" };
      return { key: "kickOff", label: `Kick off season ${season}`, tab: "season" };
    case "reveal":
      return { key: "startSeason", label: `Start season ${season}`, tab: "season" };
    case "result":
      if (season >= CAREER_SEASONS) return { key: "careerComplete", label: "Career complete", tab: "club" };
      return { key: "openWindow", label: "Open the window", tab: "season" };
    case "transfer":
      return { key: "closeWindow", label: "Close the window", tab: "season" };
    default:
      return { key: "unknown", label: "Continue", tab: null };
  }
}
