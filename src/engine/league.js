// Clubs already up, or relegated this same summer, can't be drawn (bug #1:
// a club went down and straight back up in one transition).
export function drawPromotedClubs(pool, count, excludeNames, rng) {
  const available = pool.filter((c) => !excludeNames.has(c.name));
  return rng.shuffle(available).slice(0, count).map((c) => ({ ...c, lastSeason: "promoted" }));
}

// Rivals finishing 18th to 20th go down. Your XI never does, so a bottom-three
// finish sends one fewer club down.
export function applyPromotionRelegation(opponents, table, pool, rng) {
  if (!table) return { opponents, relegated: [], promoted: [] };
  const relegatedNames = table.filter((r) => !r.isUser && r.position >= 18).map((r) => r.name);
  if (relegatedNames.length === 0) return { opponents, relegated: [], promoted: [] };
  const survivors = opponents.filter((o) => !relegatedNames.includes(o.name));
  const excludeNames = new Set([...survivors.map((o) => o.name), ...relegatedNames]);
  const promotedClubs = drawPromotedClubs(pool, relegatedNames.length, excludeNames, rng);
  return { opponents: [...survivors, ...promotedClubs], relegated: relegatedNames, promoted: promotedClubs.map((c) => c.name) };
}
