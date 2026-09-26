export function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
export function seasonLabel(year) { return `${year}-${String(year + 1).slice(2)}`; }

// One draw, in proportion to `weights`; null when no weight is positive.
export function weightedPick(items, weights, rng) {
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (!(total > 0)) return null;
  let r = rng.next() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r < 0 && weights[i] > 0) return items[i];
  }
  return items.findLast((_, i) => weights[i] > 0);
}
