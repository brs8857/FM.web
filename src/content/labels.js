// Vocabulary for the new tree (spec 04 Appendix A). Keys never change; only
// the words do. Screens take every game term from here, never from a
// hard-coded string.
import { ROLES, DUTY_INFO } from "../engine/roles.js";
import { familiarityLabel } from "../engine/familiarity.js";
import { mentalityLabel } from "../engine/readout.js";

export const POSITION_LABEL = {
  GK: "Goalkeeper", CB: "Centre-back", FB: "Full-back", DM: "Defensive midfielder",
  CM: "Central midfielder", AM: "Attacking midfielder", WIDE: "Winger", ST: "Striker",
};

// Concepts that were renamed: the mechanics are unchanged.
export const CONCEPT = { role: "Job", duty: "Brief", familiarity: "Cohesion", shape: "Discipline", style: "Identity" };

export const BRIEF_LABEL = Object.fromEntries(Object.entries(DUTY_INFO).map(([key, d]) => [key, d.label]));
export const DISCIPLINE_LABEL = { structured: "Rigid", fluid: "Loose" };
export const MARKING_LABEL = { zonal: "Zonal", man: "Man-to-man" };
export const IDENTITY_LABEL = { none: "No clear plan", bespoke: "Bespoke" };

export const STRENGTH_LABEL = { attack: "Attack", creativity: "Creativity", buildup: "Build-up", press: "Press", defSolidity: "Defence", physical: "Physical" };
export const STRENGTH_KEYS = Object.keys(STRENGTH_LABEL);

export const DIAL_LABEL = {
  mentality: "Mentality", tempo: "Tempo", directness: "Directness", width: "Width", focus: "Passing focus",
  counter: "Counter-attacking", crossing: "Crossing", gkDistribution: "Keeper distribution",
  press: "Pressing", line: "Defensive line", tackling: "Tackling",
};
export const DIAL_ENDS = {
  mentality: ["Contain", "All-out"], tempo: ["Slow", "Fast"], directness: ["Short", "Direct"], width: ["Narrow", "Wide"],
  focus: ["Through the middle", "Down the flanks"], counter: ["Reset shape", "Break at pace"], crossing: ["Cut inside", "Cross often"],
  gkDistribution: ["Play out short", "Go long"], press: ["Drop off", "High press"], line: ["Deep block", "High line"], tackling: ["Cautious", "Aggressive"],
};
export const DIAL_TERM = {
  mentality: "mentality", tempo: "tempo", directness: "directness", width: "width", focus: "focus", counter: "counter",
  crossing: "crossing", gkDistribution: "gk-distribution", press: "press", line: "line", tackling: "tackling",
};
export const STYLE_SUB = { balanced: "no identity bonus" };
export const APPROACH_DIALS = ["mentality", "tempo", "directness"];
export const IN_POSSESSION_DIALS = ["width", "focus", "counter", "crossing", "gkDistribution"];
export const OUT_OF_POSSESSION_DIALS = ["press", "line", "tackling"];

// seasonTier's names are keys here: the engine copy is locked by the golden
// season files until C1, so the back page reads its headline and standfirst
// from this map instead.
export const TIER_LABEL = {
  "THE PERFECT SEASON": "Perfect season",
  "Invincibles": "Invincibles",
  "Centurions": "Centurions",
  "Champions": "Champions",
  "Champions League": "Top five",
  "Europa League": "European places",
  "Conference League": "Just outside Europe",
  "Mid-Table Mediocrity": "Safe",
  "Relegation Battle": "Relegated",
};
export const TIER_STANDFIRST = {
  "THE PERFECT SEASON": "38 wins from 38. No side in the top flight's history has managed it.",
  "Invincibles": "Champions and unbeaten from August to May.",
  "Centurions": "Past 100 points: a record-breaking total that dwarfs most title-winning seasons.",
  "Champions": "Champions of England. The trophy, the open-top bus, the lot.",
  "Champions League": "A top-five finish and the biggest nights in Europe to plan for.",
  "Europa League": "European football secured: a solid campaign in the top half.",
  "Conference League": "Just enough for a European place, from a season that beat its numbers.",
  "Mid-Table Mediocrity": "Comfortable and safe, and forgotten by August.",
  "Relegation Battle": "A relegation fight that went the wrong way. Back to the drawing board.",
};

export function tierLabel(tier) {
  return { name: TIER_LABEL[tier.name] ?? tier.name, sub: TIER_STANDFIRST[tier.name] ?? tier.sub, color: tier.color };
}

export function roleLabel(type, key) {
  return ROLES[type]?.find((r) => r.key === key)?.label ?? key;
}

export function briefLabel(duty) {
  return BRIEF_LABEL[duty] ?? duty;
}

export const cohesionLabel = familiarityLabel;
export { mentalityLabel };

// The identity line: the engine's detected identity, or why there isn't one
// (the same neutrality test identitySynergy applies).
export function identityLabel(synergyLabel, instructions) {
  if (synergyLabel) return synergyLabel;
  const dials = ["mentality", "tempo", "directness", "width", "press", "line", "tackling"].map((k) => instructions[k]);
  const extremity = dials.reduce((sum, v) => sum + Math.abs(v - 50), 0) / dials.length / 50;
  return extremity < 0.16 ? IDENTITY_LABEL.none : IDENTITY_LABEL.bespoke;
}
