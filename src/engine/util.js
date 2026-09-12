export function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
export function seasonLabel(year) { return `${year}-${String(year + 1).slice(2)}`; }
