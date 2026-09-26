import { clamp } from "./util.js";
import { FORMATIONS } from "./formations.js";
import { identityKey } from "./tactics.js";

/* ------------------------------ Familiarity ------------------------------- */
export const SIDE_MISMATCH_PENALTY = 2;
export const MEMORY_PER_SEASON = 2;
export const MEMORY_CAP = 8;
export const MEMORY_CHANGE_PENALTY = 4;
// Cohesion by matches already played this season in the same system: index
// 0 is a system just changed (or the season's first match), the last entry
// holds from there on. Spec 07 proposed +3 from the seventh match; measured
// by `npm run sim`, that lifted a side that never changes its system by 3
// points and 6 title points a season over the balance C5 tuned, so settling
// is a cost of change only: keeping a system is worth what it was before.
export const SETTLING = [-3, -2, -1, 0];
export const EMPTY_MEMORY = { formationKey: null, styleKey: null, seasons: 0, signature: null, matches: 0 };

// Cohesion memory: the system (shape and identity) the club played its
// last seasons in. Staying in it earns a little each season; changing it
// costs, once, on the change.
export function memoryBonus(memory, formationKey, styleKey) {
  if (!memory || memory.seasons === 0) return 0;
  if (memory.formationKey === formationKey && memory.styleKey === styleKey) return Math.min(MEMORY_CAP, MEMORY_PER_SEASON * memory.seasons);
  return -MEMORY_CHANGE_PENALTY;
}

export function nextMemory(memory, formationKey, styleKey) {
  const same = memory && memory.formationKey === formationKey && memory.styleKey === styleKey;
  return { ...EMPTY_MEMORY, formationKey, styleKey, seasons: same ? memory.seasons + 1 : 1 };
}

// The system as settling sees it: the shape, the seven identity dials to the
// nearest five, and the discipline. Personnel and the other four dials have
// their own costs already.
const SIGNATURE_DIALS = ["mentality", "tempo", "directness", "width", "press", "line", "tackling"];
export function systemSignature(formationKey, instructions) {
  return [formationKey, ...SIGNATURE_DIALS.map((k) => Math.round(instructions[k] / 5) * 5), instructions.shape].join(" ");
}

// Settling, the within-season half of the memory: how many matches in a row
// this system has been played for, and what that is worth for the next one.
export function settling(memory, formationKey, instructions) {
  const signature = systemSignature(formationKey, instructions);
  const matches = memory?.signature === signature ? memory.matches : 0;
  const changed = Boolean(memory?.signature) && memory.signature !== signature;
  return { signature, matches, modifier: SETTLING[Math.min(matches, SETTLING.length - 1)], changed };
}

export function afterMatch(memory, settle) {
  return { ...memory, signature: settle.signature, matches: settle.matches + 1 };
}

export function eraSpreadPenalty(spread) {
  return clamp(spread / 4.5, 0, 16);
}

export function eraSpread(players) {
  const years = players.map((p) => parseInt((p.seasonKey || "2010_0").split("_")[0], 10)).filter((y) => !isNaN(y));
  return years.length > 1 ? Math.max(...years) - Math.min(...years) : 0;
}

export function computeFamiliarity(assignments, instructions, formationKey, memory = null) {
  const list = assignments.filter((a) => a && a.player);
  if (list.length < 11) return 50;
  let fam = 70 + (memory ? memoryBonus(memory, formationKey, identityKey(instructions)) + settling(memory, formationKey, instructions).modifier : 0);

  list.forEach((a) => {
    const slotDef = FORMATIONS[formationKey].slots.find((s) => s.id === a.slotId);
    if (!slotDef) return;
    // side mismatches (e.g. a natural right-footed RB played on the left) cost a little cohesion
    if (slotDef.side && a.player.side && slotDef.side !== a.player.side) fam -= SIDE_MISMATCH_PENALTY;
    // dragging a player far from his template position is bold — costs familiarity,
    // proportional to how far he's wandered from his original slot.
    if (a.pos) {
      const dist = Math.hypot(a.pos.x - slotDef.x, a.pos.y - slotDef.y);
      fam -= clamp(dist / 6, 0, 9);
    }
  });

  // extreme, uncompromising instructions reduce familiarity — bold systems take time to click
  const extremity = ["mentality", "tempo", "directness", "width", "press", "line", "tackling", "counter", "crossing", "gkDistribution"]
    .map((k) => Math.abs(instructions[k] - 50))
    .reduce((a, b) => a + b, 0) / 10;
  fam -= extremity * 0.24;
  if (instructions.offsideTrap) fam -= 4;

  // squad quality: better players adapt to instructions faster, but this is
  // capped — a stacked all-time-XI doesn't get unlimited extra cohesion just
  // for being individually brilliant.
  const avgOv = list.reduce((s, a) => s + a.player.ov, 0) / list.length;
  fam += clamp((avgOv - 70) * 0.35, -14, 6);

  // era cohesion: a squad drafted from wildly different decades of the league
  // (peak-90s legends lining up next to 2020s players) hasn't actually played
  // a minute of football together in real life — the wider the spread of
  // seasons drafted from, the less battle-tested the group really is.
  fam -= eraSpreadPenalty(eraSpread(list.map((a) => a.player)));

  // attacking role variety on the same duty spectrum in defense = coherent; wild swings cost a little
  const cbDuties = list.filter((a) => a.player.slot === "CB").map((a) => a.duty);
  if (new Set(cbDuties).size > 1) fam -= 3;

  return Math.round(clamp(fam, 12, 96));
}

export function familiarityLabel(f) {
  if (f >= 80) return "Clicking";
  if (f >= 60) return "Settled";
  if (f >= 42) return "Rough";
  return "Strangers";
}
