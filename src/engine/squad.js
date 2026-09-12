import { defaultRoleFor, defaultDutyFor } from "./roles.js";
import { isOwnedIdentity, playerIdentity } from "./identity.js";

export function nextEmptySlotIndex(assignments) {
  return assignments.findIndex((a) => !a.player);
}

// Once the starting XI is complete, automatically pull a bench from the same
// club-seasons that were drafted from (a backup keeper first, then the best
// remaining outfield players).
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

// Transfer window shortlist: candidates drawn from the career's era, excluding
// anyone already at the club. Sampling 40 club-seasons keeps it instant.
export function generateShortlist(getSquad, index, { eraMin, eraMax }, ownedIds, rng, { count = 5, ownedIdentities = [] } = {}) {
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

// Sign a new player into the XI at a given slot, sending whoever was there
// to the bench (bumping the weakest bench player out to make room if it's
// already full of 6).
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

export function signToBench(bench, newPlayer) {
  const entry = { player: newPlayer, role: null, duty: null };
  if (bench.length < 6) return [...bench, entry];
  let weakestIdx = 0;
  bench.forEach((b, i) => { if ((b.player?.ov ?? 999) < (bench[weakestIdx].player?.ov ?? 999)) weakestIdx = i; });
  const copy = bench.slice();
  copy[weakestIdx] = entry;
  return copy;
}
