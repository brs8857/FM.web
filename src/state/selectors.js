import { ROLES } from "../engine/roles.js";
import { computeFamiliarity } from "../engine/familiarity.js";
import { computeTeamProfile } from "../engine/tactics.js";

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
