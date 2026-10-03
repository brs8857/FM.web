// Vocabulary for the new tree (spec 04 Appendix A). Keys never change; only
// the words do. Screens take every game term from here, never from a
// hard-coded string.
import { ROLES, DUTY_INFO } from "../engine/roles.js";
import { familiarityLabel } from "../engine/familiarity.js";
import { mentalityLabel } from "../engine/readout.js";
import { identityKey } from "../engine/tactics.js";

export const POSITION_LABEL = {
  GK: "Goalkeeper", CB: "Centre-back", FB: "Full-back", DM: "Defensive midfielder",
  CM: "Central midfielder", AM: "Attacking midfielder", WIDE: "Winger", ST: "Striker",
};

// Concepts that were renamed: the mechanics are unchanged.
export const CONCEPT = { role: "Job", duty: "Brief", familiarity: "Cohesion", shape: "Discipline", style: "Identity" };

export const BRIEF_LABEL = Object.fromEntries(Object.entries(DUTY_INFO).map(([key, d]) => [key, d.label]));
export const DISCIPLINE_LABEL = { structured: "Rigid", fluid: "Loose" };
export const MARKING_LABEL = { zonal: "Zonal", man: "Man-to-man" };
// The engine files a style under its name as first written; the screens
// print it in sentence case.
export const IDENTITY_LABEL = {
  none: "No clear plan", bespoke: "Bespoke",
  "Possession Control": "Possession control", "Low Block Counter": "Low-block counter", "Direct & Vertical": "Direct and vertical",
  "Park The Bus": "Park the bus", "Wing Play": "Wing play",
};

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

// seasonTier's names are keys here: the engine keeps its own headline and
// standfirst for the record, and the back page reads its words from this map.
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
  "Perfect Championship season": "Perfect season",
  "Championship winners": "Championship winners",
  "Automatic promotion": "Promoted",
  "Play-offs": "Play-offs",
  "Play-off winners": "Promoted through the play-offs",
  "Play-off final": "Beaten in the final",
  "Play-off semi-final": "Out in the semi-finals",
  "Championship mid-table": "Mid-table",
  "Championship relegation zone": "Bottom three",
};
export const TIER_STANDFIRST = {
  "THE PERFECT SEASON": "38 wins from 38. No side in the top flight's history has managed it.",
  "Invincibles": "Champions and unbeaten from August to May.",
  "Centurions": "Champions with a hundred points or more. Most title winners never get near it.",
  "Champions": "Champions of England. The trophy, the open-top bus, the lot.",
  "Champions League": "A top-five finish and the biggest nights in Europe to plan for.",
  "Europa League": "Europe next season, from a good year in the top half.",
  "Conference League": "Eighth: one place short of Europe, and a summer to wonder where the points went.",
  "Mid-Table Mediocrity": "Comfortable and safe, and forgotten by August.",
  "Relegation Battle": "Bottom three, and down to the Championship next season.",
  "Perfect Championship season": "46 wins from 46, and up to the top flight as champions.",
  "Championship winners": "Top of the Championship and up to the top flight as champions.",
  "Automatic promotion": "A top-two finish and straight up, with no play-offs to sweat through.",
  "Play-offs": "Between 3rd and 6th: two legs and a final for the last place up.",
  "Play-off winners": "Through the semi-final and the final, and up to the top flight the hard way.",
  "Play-off final": "One match from the top flight, and it went the other way. Another go in the Championship.",
  "Play-off semi-final": "Into the play-offs and out over two legs. Another season in the Championship.",
  "Championship mid-table": "Neither up nor down: another season in the Championship.",
  "Championship relegation zone": "Bottom three. Any other club would drop to League One; this XI stays for another go.",
};

export const DIVISION_LABEL = { top: "Top flight", championship: "Championship" };

export function divisionLabel(division) {
  return DIVISION_LABEL[division ?? "top"];
}

export function tierLabel(tier) {
  return { name: TIER_LABEL[tier.name] ?? tier.name, sub: TIER_STANDFIRST[tier.name] };
}

export function roleLabel(type, key) {
  return ROLES[type]?.find((r) => r.key === key)?.label ?? key;
}

export function briefLabel(duty) {
  return BRIEF_LABEL[duty] ?? duty;
}

export const cohesionLabel = familiarityLabel;
export { mentalityLabel };

export function identityName(key) {
  return IDENTITY_LABEL[key] ?? key;
}

export function identityLabel(instructions) {
  return identityName(identityKey(instructions));
}
