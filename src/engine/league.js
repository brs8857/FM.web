/* ===================== Promotion / relegation between seasons ============== */
// The real 2026-27 EFL Championship's 24 clubs. Where a club has a Premier
// League spell in our historical database (1992-2024), its numbers are
// grounded in that real data — most recent-season squad strength (with a
// gap penalty for time away), plus pedigree/volatility derived from every
// season they've actually had. The handful with no top-flight history in
// our window get a fixed, deliberately weaker generated profile instead of
// nothing. Which of these get drawn each promotion is still random — this
// only fixes *who's in the pool*, not who comes up.

// Draws `count` clubs at random from the Championship pool, excluding
// anyone currently already in the top flight and anyone relegated this same
// summer (so a club can't be "promoted" while it's still up, and can't bounce
// straight back down-then-up in the same transition) — once up, a club stays
// up until it goes down on its own merit, same as anyone else; there's no
// scripted script to any of it.
export function drawPromotedClubs(pool, count, excludeNames, rng) {
  const available = pool.filter((c) => !excludeNames.has(c.name));
  return rng.shuffle(available).slice(0, count).map((c) => ({ ...c, lastSeason: "promoted" }));
}

// After each season, whichever real clubs finished 18th-20th (excluding your
// own XI's slot, wherever it landed) go down to the Championship, replaced by
// an equal number of real clubs drawn up from it — the league genuinely
// evolves under you across a career rather than staying static.
export function applyPromotionRelegation(opponents, table, pool, rng) {
  if (!table) return { opponents, relegated: [], promoted: [] };
  const relegatedNames = table.filter((r) => !r.isUser && r.position >= 18).map((r) => r.name);
  if (relegatedNames.length === 0) return { opponents, relegated: [], promoted: [] };
  const survivors = opponents.filter((o) => !relegatedNames.includes(o.name));
  const excludeNames = new Set([...survivors.map((o) => o.name), ...relegatedNames]);
  const promotedClubs = drawPromotedClubs(pool, relegatedNames.length, excludeNames, rng);
  return { opponents: [...survivors, ...promotedClubs], relegated: relegatedNames, promoted: promotedClubs.map((c) => c.name) };
}
