import { clamp, weightedPick } from "./util.js";
import { playerContribution } from "./tactics.js";

export function poissonSample(lambda, rng) {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= rng.next(); } while (p > L && k < 12);
  return k - 1;
}

export const HOME_ADVANTAGE = 3;

// This season's squad blended with the club's mean over every top-flight
// season it has had, so pedigree counts for a little.
export function rivalStrength(opp) {
  return opp.ov * 0.82 + opp.histMean * 0.18;
}

// The gap is capped at 33 so no mismatch is ever a certainty.
function expectedGoals(attack, defence, cap) {
  return clamp(1.05 + clamp(attack - defence, -33, 33) / 20, 0.25, cap);
}

function noisy(xg, noiseScale, rng) {
  return clamp(xg * (1 + (rng.next() - 0.5) * noiseScale), 0.05, 5);
}

export function simulateMatch(profile, opp, isHome, familiarity, rng) {
  const homeAdv = isHome ? HOME_ADVANTAGE : 0;
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

export const YELLOWS_PER_MATCH = 1.6;
export const RED_CHANCE = 0.05;
export const SECOND_YELLOW_SHARE = 0.5;

// Aggressive tackling costs cards: 0.6x the rate at Cautious, 1.0x at the
// midpoint, 1.4x at Aggressive.
export function cardScale(tackling) {
  return 0.6 + tackling / 125;
}

// Cards go to whoever defends and presses most; a keeper's defending is saves,
// not tackles, so he counts a tenth.
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
  // Half the reds are a second yellow; the kind is drawn after the carrier,
  // and every draw here comes after the goals, so no score depends on it.
  if (rng.next() < RED_CHANCE * scale) {
    const red = draw("red");
    if (red && rng.next() < SECOND_YELLOW_SHARE) red.kind = "second-yellow";
    cards.push(red);
  }
  return cards.filter(Boolean).sort((a, b) => a.minute - b.minute);
}

// Runs on its own rng stream so narrating a match never alters its score.
// Our goals go to starters in proportion to their attacking contribution, the
// same number the profile is built from, so the board decides who scores.
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

// The English top flight's rule (spec 08 §5.1). Yellows are a season total: the
// fifth by week 19 costs a match, the tenth by week 32 two, the fifteenth
// three. A straight red costs three; a second yellow one, and its two
// yellows don't join the total. `banned` counts matches still to serve.
export const YELLOW_BANS = [{ yellows: 5, byWeek: 19, matches: 1 }, { yellows: 10, byWeek: 32, matches: 2 }, { yellows: 15, byWeek: Infinity, matches: 3 }];
export const RED_BAN = { red: 3, "second-yellow": 1 };
export const MAX_BAN = 3;

// The cut-offs are set for a 38-week season and move with a longer one: the
// Championship's 46 put them at weeks 23 and 39, near where the real ones fall.
const cutoff = (byWeek, weeks) => (byWeek === Infinity ? Infinity : Math.round((byWeek * weeks) / 38));

export function yellowBan(yellows, week, weeks = 38) {
  return YELLOW_BANS.find((b) => b.yellows === yellows && week <= cutoff(b.byWeek, weeks))?.matches ?? 0;
}

// The next threshold still live at `week`, for the player sheet.
export function nextYellowBan(yellows, week, weeks = 38) {
  return YELLOW_BANS.find((b) => b.yellows > yellows && week <= cutoff(b.byWeek, weeks)) ?? null;
}

export function nextDiscipline(discipline, cards, week, weeks = 38) {
  const next = {};
  for (const [id, d] of Object.entries(discipline)) next[id] = { yellows: d.yellows, banned: Math.max(0, d.banned - 1) };
  const bans = [];
  for (const card of cards) {
    const d = next[card.id] ?? { yellows: 0, banned: 0 };
    const yellows = card.kind === "yellow" ? d.yellows + 1 : d.yellows;
    const ban = card.kind === "yellow" ? yellowBan(yellows, week, weeks) : RED_BAN[card.kind];
    next[card.id] = { yellows, banned: Math.max(d.banned, ban) };
    if (ban > 0) bans.push({ id: card.id, name: card.name, matches: ban });
  }
  for (const [id, d] of Object.entries(next)) if (d.yellows === 0 && d.banned === 0) delete next[id];
  return { discipline: next, bans };
}
