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
export const YELLOWS_PER_MATCH = 1.6;
export const RED_CHANCE = 0.05;

// Aggressive tackling costs cards: 0.6x the rate at Cautious, 1.0x at the
// midpoint, 1.4x at Aggressive.
export function cardScale(tackling) {
  return 0.6 + tackling / 125;
}

// Our bookings for a match: a Poisson count of yellows and a small chance
// of a red, both scaled by the tackling dial, each carried by a starter drawn
// by how much he defends and presses (a keeper at a tenth of his, since his
// defending is saves, not tackles).
// Nobody is booked twice in a match.
function bookings(starters, tackling, rng) {
  const scale = cardScale(tackling);
  const on = starters.filter((a) => a.player && a.role);
  const weights = on.map((a) => {
    const c = playerContribution(a);
    return Math.max(0, c.def + c.press) * (a.type === "GK" ? 0.1 : 1);
  });
  const draw = (kind) => {
    const a = weightedPick(on, weights, rng);
    if (!a) return null;
    weights[on.indexOf(a)] = 0;
    return { minute: rng.next() < STOPPAGE_CHANCE ? 91 + rng.int(5) : 1 + rng.int(90), slotId: a.slotId, id: a.player.id, name: a.player.name, kind };
  };
  const cards = [];
  const yellows = poissonSample(YELLOWS_PER_MATCH * scale, rng);
  for (let i = 0; i < yellows; i++) cards.push(draw("yellow"));
  if (rng.next() < RED_CHANCE * scale) cards.push(draw("red"));
  return cards.filter(Boolean).sort((a, b) => a.minute - b.minute);
}

export function matchEvents({ gf, ga }, starters, rng, { tackling = 50 } = {}) {
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
  return { goals, cards: bookings(starters, tackling, rng) };
}

// The bans a match leaves (spec 07 §5.4): those serving one have served it,
// then a red, or a fifth yellow, bans a player for the next match. Entries
// with nothing to carry are dropped.
export const YELLOWS_FOR_BAN = 5;
export function nextDiscipline(discipline, cards) {
  const next = {};
  for (const [id, d] of Object.entries(discipline)) next[id] = { yellows: d.yellows, banned: Math.max(0, d.banned - 1) };
  const bans = [];
  for (const card of cards) {
    const d = next[card.id] ?? { yellows: 0, banned: 0 };
    if (card.kind === "red") next[card.id] = { yellows: 0, banned: 1 };
    else if (d.yellows + 1 >= YELLOWS_FOR_BAN) next[card.id] = { yellows: 0, banned: 1 };
    else next[card.id] = { ...d, yellows: d.yellows + 1 };
    if (next[card.id].banned > 0 && !bans.some((b) => b.id === card.id)) bans.push({ id: card.id, name: card.name });
  }
  for (const [id, d] of Object.entries(next)) if (d.yellows === 0 && d.banned === 0) delete next[id];
  return { discipline: next, bans };
}
