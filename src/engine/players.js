import { clamp } from "./util.js";
import { isOwnedIdentity } from "./identity.js";

export const STAT_KEYS = ["pace", "shooting", "passing", "dribbling", "defending", "physical"];
export const STAT_LABELS = { pace: "Pace", shooting: "Shooting", passing: "Passing", dribbling: "Dribbling", defending: "Defending", physical: "Physical" };

// Each position's stat profile as offsets from the overall, in STAT_KEYS
// order: a stat is `ov + offset + noise`. Fitted to the dataset (docs/data.md).
export const ARCHETYPES = {
  GK: [-14, -24, -10, -17, 5, -2],
  CB: [-8, -19, -10, -14, 6, 2],
  FB: [1, -16, -5, -3, -2, -5],
  DM: [-8, -14, -2, -8, 3, 0],
  CM: [-5, -10, 3, -3, -8, -5],
  AM: [-3, -2, 3, 4, -18, -11],
  WIDE: [6, -5, -5, 5, -19, -11],
  ST: [0, 8, -13, -1, -22, -1],
};
export const STAT_NOISE = 5;

export function statsFromOv(slot, ov, rng) {
  const offsets = ARCHETYPES[slot] ?? ARCHETYPES.CM;
  return Object.fromEntries(STAT_KEYS.map((k, i) => [k, clamp(Math.round(ov + offsets[i] + (rng.next() * 2 - 1) * STAT_NOISE), 1, 99)]));
}

// The inverse of statsFromOv: the overall a set of stats implies for the
// position, averaging the noise away.
export function ovFromStats(slot, stats) {
  const offsets = ARCHETYPES[slot] ?? ARCHETYPES.CM;
  const total = STAT_KEYS.reduce((sum, k, i) => sum + stats[k] - offsets[i], 0);
  return clamp(Math.round(total / STAT_KEYS.length), 1, 99);
}

export function rowToPlayer(row, seasonKey) {
  const [name, slot, side, age, nat, ov, pace, shooting, passing, dribbling, defending, physical] = row;
  return {
    id: `${seasonKey}__${name}__${ov}__${slot}`,
    name, slot, side: side || null, age, nat, ov,
    stats: { pace, shooting, passing, dribbling, defending, physical },
    seasonKey,
  };
}

export const RETIREMENT_AGE = 36;
const YOUNGEST_KNOWN_AGE = 15;

// Mean change per stat for a player turning `age`, fitted to how the
// archive's overalls run with age: growth to the mid-twenties, a plateau at
// 26–29, decline from 30 that steepens, and pace going first.
export function ageDrift(age) {
  if (age == null || age < YOUNGEST_KNOWN_AGE) return { general: 0, pace: 0 };
  if (age <= 20) return { general: 3, pace: 0 };
  if (age <= 22) return { general: 2, pace: 0 };
  if (age <= 24) return { general: 1, pace: 0 };
  if (age <= 25) return { general: 0.5, pace: 0 };
  if (age <= 29) return { general: 0, pace: 0 };
  if (age <= 31) return { general: -0.5, pace: -1 };
  if (age <= 33) return { general: -1.5, pace: -1.5 };
  if (age <= 35) return { general: -2.5, pace: -2 };
  return { general: -3.5, pace: -2 };
}

// One summer older. Each stat moves by the curve's mean plus at most a point
// of noise, and the overall moves by what the stats imply for the position,
// so a player's rating never jumps away from his numbers.
export function progressPlayer(player, rng) {
  if (player.age == null || player.age < YOUNGEST_KNOWN_AGE) return player;
  const age = player.age + 1;
  const { general, pace } = ageDrift(age);
  const stats = Object.fromEntries(STAT_KEYS.map((k) => {
    const mean = general + (k === "pace" ? pace : 0);
    return [k, clamp(Math.round(player.stats[k] + mean + (rng.next() * 2 - 1)), 1, 99)];
  }));
  const ov = clamp(player.ov + ovFromStats(player.slot, stats) - ovFromStats(player.slot, player.stats), 1, 99);
  return { ...player, age, stats, ov };
}

export function retires(player) {
  return player.age != null && player.age >= RETIREMENT_AGE;
}

export function slotAccepts(slotType, player) {
  if (slotType === "ANY") return true;
  return player.slot === slotType;
}

export function createSquadLookup(dataset) {
  const cache = new Map();
  return function getSquad(year, clubId) {
    const key = `${year}_${clubId}`;
    if (!cache.has(key)) {
      cache.set(key, (dataset.squads[key] || []).map((row) => rowToPlayer(row, key)));
    }
    return cache.get(key);
  };
}

export function buildPool(getSquad, year, clubId, slotType, side, draftedIds, ownedIdentities = []) {
  const squad = getSquad(year, clubId);
  // A squad with nobody left for the slot offers everyone, flagged as relaxed.
  const available = (p) => !draftedIds.has(p.id) && !isOwnedIdentity(ownedIdentities, p);
  let pool = squad.filter((p) => available(p) && slotAccepts(slotType, p));
  let relaxed = false;
  if (pool.length === 0) { pool = squad.filter(available); relaxed = true; }
  pool.sort((a, b) => {
    if (side) {
      const aSide = a.side === side ? 1 : 0;
      const bSide = b.side === side ? 1 : 0;
      if (aSide !== bSide) return bSide - aSide;
    }
    return b.ov - a.ov;
  });
  return { players: pool, relaxed };
}
