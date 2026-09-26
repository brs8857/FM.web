import { clamp, weightedPick } from "./util.js";
import { playerContribution } from "./tactics.js";

/* ============================== Simulation ================================ */
export function poissonSample(lambda, rng) {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= rng.next(); } while (p > L && k < 12);
  return k - 1;
}

export const HOME_ADVANTAGE = 3;

// Blend this season's squad strength with the club's long-run historical
// pedigree (mean squad strength across every top-flight season they've had) —
// a historically elite club plays a little tougher than a single season's
// number alone would suggest, and vice versa for a historically weaker one.
export function rivalStrength(opp) {
  return opp.ov * 0.82 + opp.histMean * 0.18;
}

// The raw quality gap is capped and run through a wider divisor than a
// pure stat-diff model would use — a stronger team is still favoured, but
// no gap (however large on paper) buys a guaranteed landslide. Real upsets
// stay genuinely possible even when you're clearly the better side.
function expectedGoals(attack, defence, cap) {
  return clamp(1.05 + clamp(attack - defence, -33, 33) / 20, 0.25, cap);
}

function noisy(xg, noiseScale, rng) {
  return clamp(xg * (1 + (rng.next() - 0.5) * noiseScale), 0.05, 5);
}

export function simulateMatch(profile, opp, isHome, familiarity, rng) {
  const homeAdv = isHome ? HOME_ADVANTAGE : 0;
  // Even a perfectly-drilled tactic still has an off day — the floor on
  // variance is higher than before, so no setup is ever fully "solved".
  const noiseScale = clamp(1.1 - familiarity / 150, 0.28, 0.9);
  const effOv = rivalStrength(opp);

  const attSkill = profile.attack + homeAdv + (profile.creativity - 50) * 0.15;
  const defSkill = profile.defSolidity + homeAdv * 0.5;

  const xgFor = expectedGoals(attSkill, effOv, 3.4);
  const xgAgainst = expectedGoals(effOv, defSkill, 3.0);

  const noisyFor = noisy(xgFor, noiseScale, rng);
  const noisyAgainst = noisy(xgAgainst, noiseScale, rng);

  return { gf: poissonSample(noisyFor, rng), ga: poissonSample(noisyAgainst, rng) };
}

// A rival's match-to-match swing comes from its volatility (the spread of
// its history), where the user's comes from cohesion.
export function rivalNoise(opp) {
  return clamp(0.45 + opp.vol / 40, 0.28, 0.9);
}

// Rival against rival, the mirror of simulateMatch: each club attacks and
// defends with the same blended strength, the home side gets the same
// advantage the user would, and swapping the two sides swaps the numbers.
export function simulateRivalMatch(home, away, rng) {
  const homeStrength = rivalStrength(home), awayStrength = rivalStrength(away);
  const xgHome = expectedGoals(homeStrength + HOME_ADVANTAGE, awayStrength, 3.4);
  const xgAway = expectedGoals(awayStrength, homeStrength + HOME_ADVANTAGE * 0.5, 3.4);
  const noisyHome = noisy(xgHome, rivalNoise(home), rng);
  const noisyAway = noisy(xgAway, rivalNoise(away), rng);
  return { hg: poissonSample(noisyHome, rng), ag: poissonSample(noisyAway, rng) };
}

export const STOPPAGE_CHANCE = 0.08;

// Attributes the goals of a decided scoreline, on its own rng stream so it
// never alters a result. The opponent's goals carry only a minute; ours go to
// a starter drawn in proportion to his attacking contribution (job, brief,
// position and freedom, the same number the profile is built from), so a
// poacher pushed up top leads the scoring and a blocker almost never does.
// Keepers never score. Minutes are distinct, ascending, and occasionally in
// stoppage time (91-95).
export function matchEvents({ gf, ga }, starters, rng) {
  const minutes = new Set();
  while (minutes.size < gf + ga) minutes.add(rng.next() < STOPPAGE_CHANCE ? 91 + rng.int(5) : 1 + rng.int(90));
  const sides = rng.shuffle([...Array(gf).fill(true), ...Array(ga).fill(false)]);
  const outfield = starters.filter((a) => a.player && a.role && a.type !== "GK");
  const weights = outfield.map((a) => Math.max(0, playerContribution(a).att));
  const goals = [...minutes].sort((a, b) => a - b).map((minute, i) => {
    if (!sides[i]) return { minute, us: false };
    const a = weightedPick(outfield, weights, rng) ?? rng.pick(outfield);
    return { minute, us: true, slotId: a.slotId, id: a.player.id, name: a.player.name };
  });
  return { goals };
}
