import { defaultRoleFor, defaultDutyFor } from "./roles.js";
import { isOwnedIdentity, playerIdentity } from "./identity.js";
import { progressPlayer, retires } from "./players.js";

export function nextEmptySlotIndex(assignments) {
  return assignments.findIndex((a) => !a.player);
}

export function autoFillBench(getSquad, assignments, draftedIds, ownedIdentities = []) {
  const usedSeasons = [...new Set(assignments.map((a) => a.player.seasonKey))];
  const dids = new Set(draftedIds);
  let remaining = [];
  usedSeasons.forEach((sk) => {
    const [year, clubId] = sk.split("_");
    getSquad(year, clubId).forEach((p) => { if (!dids.has(p.id)) remaining.push(p); });
  });
  const identities = [...ownedIdentities];
  const free = (p) => !dids.has(p.id) && !isOwnedIdentity(identities, p);
  const gk = remaining.filter((p) => p.slot === "GK" && free(p)).sort((a, b) => b.ov - a.ov)[0];
  const others = remaining.filter((p) => p.slot !== "GK").sort((a, b) => b.ov - a.ov);
  const bench = [];
  if (gk) { bench.push(gk); dids.add(gk.id); identities.push(playerIdentity(gk)); }
  for (const p of others) {
    if (bench.length >= 6) break;
    if (!free(p)) continue;
    bench.push(p); dids.add(p.id); identities.push(playerIdentity(p));
  }
  return { bench: bench.map((p) => ({ player: p, role: null, duty: null })), draftedIds: dids };
}

export const WINDOW_CANDIDATES = 8;
const COST_BANDS = [[90, 5], [84, 4], [78, 3], [72, 2]];
const BUDGET_BY_FINISH = [[1, 9], [4, 8], [7, 7], [17, 6]];

// Wage points: what a candidate costs, from his rating band. The best cost
// five, a squad player one.
export function wageCost(player) {
  return COST_BANDS.find(([floor]) => player.ov >= floor)?.[1] ?? 1;
}

// The budget last season's finish earns: nine for the champions, five for a
// club that went down. Any one candidate is affordable; two stars are not.
export function windowBudget(position) {
  return BUDGET_BY_FINISH.find(([last]) => position <= last)?.[1] ?? 5;
}

export function budgetLeft(budget) {
  return budget ? budget.points - budget.spent : 0;
}

// Transfer window shortlist: candidates drawn from the career's era, excluding
// anyone already at the club. Sampling 40 club-seasons keeps it instant.
export function generateShortlist(getSquad, index, { eraMin, eraMax }, ownedIds, rng, { count = WINDOW_CANDIDATES, ownedIdentities = [] } = {}) {
  const eraEntries = index.filter((e) => {
    const y = parseInt(e.y, 10);
    return y >= eraMin && y <= eraMax;
  });
  const sampled = rng.shuffle(eraEntries).slice(0, 40);
  const pool = [];
  const seen = new Set();
  sampled.forEach((e) => {
    getSquad(e.y, e.c).forEach((p) => {
      if (!ownedIds.has(p.id) && !seen.has(p.id)) { seen.add(p.id); pool.push(p); }
    });
  });
  const picked = [];
  const identities = [...ownedIdentities];
  for (const p of rng.shuffle(pool)) {
    if (picked.length >= count) break;
    if (isOwnedIdentity(identities, p)) continue;
    picked.push(p);
    identities.push(playerIdentity(p));
  }
  return picked;
}

// A full bench of six loses its weakest player to make room.
export function signToSlot(assignments, bench, slotId, newPlayer) {
  const outgoing = assignments.find((a) => a.slotId === slotId)?.player || null;
  const role = defaultRoleFor(assignments.find((a) => a.slotId === slotId).type);
  const newAssignments = assignments.map((a) => a.slotId === slotId
    ? { ...a, player: newPlayer, role: role.key, duty: defaultDutyFor(role), sliderAtt: 50, sliderDef: 50 }
    : a);
  let newBench = bench.slice();
  if (outgoing) {
    if (newBench.length < 6) {
      newBench.push({ player: outgoing, role: null, duty: null });
    } else {
      let weakestIdx = 0;
      newBench.forEach((b, i) => { if ((b.player?.ov ?? 999) < (newBench[weakestIdx].player?.ov ?? 999)) weakestIdx = i; });
      newBench[weakestIdx] = { player: outgoing, role: null, duty: null };
    }
  }
  return { assignments: newAssignments, bench: newBench };
}

function benchFitIndex(bench, slotType) {
  const fits = (b, strict) => b.player && (strict ? b.player.slot === slotType : (slotType === "GK") === (b.player.slot === "GK"));
  for (const strict of [true, false]) {
    let best = -1;
    bench.forEach((b, i) => { if (fits(b, strict) && (best < 0 || b.player.ov > bench[best].player.ov)) best = i; });
    if (best >= 0) return best;
  }
  return -1;
}

// The summer: everyone ages a year, anyone at retirement age goes. The bench
// retires first; a retiring starter's place goes to the best bench player who
// fits it, so a slot only stays empty when the bench has nobody left for it.
export function progressSquad(assignments, bench, rng) {
  const agedXI = assignments.map((a) => (a.player ? { ...a, player: progressPlayer(a.player, rng) } : a));
  const agedBench = bench.map((b) => (b.player ? { ...b, player: progressPlayer(b.player, rng) } : b));
  const retired = [];
  const remaining = agedBench.filter((b) => {
    if (b.player && retires(b.player)) { retired.push(b.player); return false; }
    return true;
  });
  const nextXI = agedXI.map((a) => {
    if (!a.player || !retires(a.player)) return a;
    retired.push(a.player);
    const idx = benchFitIndex(remaining, a.type);
    if (idx < 0) return { ...a, player: null, role: null, duty: null, sliderAtt: 50, sliderDef: 50 };
    const [replacement] = remaining.splice(idx, 1);
    const role = defaultRoleFor(a.type);
    return { ...a, player: replacement.player, role: role.key, duty: defaultDutyFor(role), sliderAtt: 50, sliderDef: 50 };
  });
  return { assignments: nextXI, bench: remaining, retired: retired.map((p) => p.name) };
}

export function signToBench(bench, newPlayer) {
  const entry = { player: newPlayer, role: null, duty: null };
  if (bench.length < 6) return [...bench, entry];
  let weakestIdx = 0;
  bench.forEach((b, i) => { if ((b.player?.ov ?? 999) < (bench[weakestIdx].player?.ov ?? 999)) weakestIdx = i; });
  const copy = bench.slice();
  copy[weakestIdx] = entry;
  return copy;
}
