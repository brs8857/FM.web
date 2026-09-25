import { clamp } from "./util.js";
import { FORMATIONS } from "./formations.js";

/* ------------------------------ Familiarity ------------------------------- */
export function computeFamiliarity(assignments, instructions, formationKey) {
  const list = assignments.filter((a) => a && a.player);
  if (list.length < 11) return 50;
  let fam = 70;

  list.forEach((a) => {
    const slotDef = FORMATIONS[formationKey].slots.find((s) => s.id === a.slotId);
    if (!slotDef) return;
    // side mismatches (e.g. a natural right-footed RB played on the left) cost a little cohesion
    if (slotDef.side && a.player.side && slotDef.side !== a.player.side) fam -= 2;
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
  const years = list.map((a) => parseInt((a.player.seasonKey || "2010_0").split("_")[0], 10)).filter((y) => !isNaN(y));
  if (years.length > 1) {
    const spread = Math.max(...years) - Math.min(...years);
    fam -= clamp(spread / 4.5, 0, 16);
  }

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
