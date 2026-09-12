import { clamp } from "./util.js";

/* ============================== Simulation ================================ */
export function poissonSample(lambda) {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L && k < 12);
  return k - 1;
}

export function simulateMatch(profile, opp, isHome, familiarity) {
  const homeAdv = isHome ? 3 : 0;
  // Even a perfectly-drilled tactic still has an off day — the floor on
  // variance is higher than before, so no setup is ever fully "solved".
  const noiseScale = clamp(1.1 - familiarity / 150, 0.28, 0.9);

  // Blend this season's squad strength with the club's long-run historical
  // pedigree (mean squad strength across every real PL season they've had) —
  // a historically elite club plays a little tougher than a single season's
  // number alone would suggest, and vice versa for a historically weaker one.
  const effOv = opp.ov * 0.82 + opp.histMean * 0.18;

  const attSkill = profile.attack + homeAdv + (profile.creativity - 50) * 0.15;
  const defSkill = profile.defSolidity + homeAdv * 0.5;

  // The raw quality gap is capped and run through a wider divisor than a
  // pure stat-diff model would use — a stronger team is still favoured, but
  // no gap (however large on paper) buys a guaranteed landslide. Real upsets
  // stay genuinely possible even when you're clearly the better side.
  const attGap = clamp(attSkill - effOv, -33, 33);
  const defGap = clamp(effOv - defSkill, -33, 33);

  let xgFor = 1.05 + attGap / 20;
  let xgAgainst = 1.05 + defGap / 20;
  xgFor = clamp(xgFor, 0.25, 3.4);
  xgAgainst = clamp(xgAgainst, 0.25, 3.0);

  const noisyFor = clamp(xgFor * (1 + (Math.random() - 0.5) * noiseScale), 0.05, 5);
  const noisyAgainst = clamp(xgAgainst * (1 + (Math.random() - 0.5) * noiseScale), 0.05, 5);

  return { gf: poissonSample(noisyFor), ga: poissonSample(noisyAgainst) };
}
