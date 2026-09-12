export const STAT_KEYS = ["pace", "shooting", "passing", "dribbling", "defending", "physical"];
export const STAT_LABELS = { pace: "Pace", shooting: "Shooting", passing: "Passing", dribbling: "Dribbling", defending: "Defending", physical: "Physical" };

export function rowToPlayer(row, seasonKey) {
  const [name, slot, side, age, nat, ov, pace, shooting, passing, dribbling, defending, physical] = row;
  return {
    id: `${seasonKey}__${name}__${ov}__${slot}`,
    name, slot, side: side || null, age, nat, ov,
    stats: { pace, shooting, passing, dribbling, defending, physical },
    seasonKey,
  };
}

/* -------------------------- Pool / slot matching -------------------------- */
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

export function buildPool(getSquad, year, clubId, slotType, side, draftedIds) {
  const squad = getSquad(year, clubId);
  // Strict position matching: a GK slot only offers goalkeepers from that exact
  // club season, a CB slot only offers centre-backs, etc. The only fallback is
  // for the rare case a squad has zero tagged players of that exact category
  // left — then we open up to the rest of the available squad.
  let pool = squad.filter((p) => !draftedIds.has(p.id) && slotAccepts(slotType, p));
  let relaxed = false;
  if (pool.length === 0) { pool = squad.filter((p) => !draftedIds.has(p.id)); relaxed = true; }
  // prefer matching side first, then by overall
  pool.sort((a, b) => {
    if (side) {
      const aSide = a.side === side ? 1 : 0;
      const bSide = b.side === side ? 1 : 0;
      if (aSide !== bSide) return bSide - aSide;
    }
    return b.ov - a.ov;
  });
  pool.relaxed = relaxed;
  return pool;
}
