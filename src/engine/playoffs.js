import { createRng, deriveSeed } from "./rng.js";
import { simulateRivalMatch, rivalStrength } from "./match.js";
import { USER_TEAM } from "./season.js";
import { clamp } from "./util.js";

// The Championship play-offs (spec 09 §6): 3rd v 6th and 4th v 5th over two
// legs, the lower-placed side at home first; level on aggregate, extra time
// then penalties; the winners meet once at a neutral ground for the last
// place up. Every draw comes from the season seed.
export const PLAYOFF_ROUNDS = ["semi1", "semi2", "final"];

export function playoffRng(seasonSeed, key) {
  return createRng(deriveSeed(seasonSeed, 3000 + PLAYOFF_ROUNDS.indexOf(key)));
}

// The pairings from the final table, higher seed first.
export function playoffDraw(table) {
  const at = (p) => (table.find((r) => r.position === p).isUser ? USER_TEAM : table.find((r) => r.position === p).name);
  return [[at(3), at(6)], [at(4), at(5)]];
}

// Extra time and penalties, as one weighted toss: the stronger side is a
// little more likely to come through, never certain to.
export function breakTie(strengthA, strengthB, rng) {
  const pA = clamp(0.5 + (strengthA - strengthB) / 60, 0.3, 0.7);
  return rng.next() < pA ? "a" : "b";
}

// A tie between two rivals: both legs and, if needed, the tie-break.
export function rivalTie(higher, lower, rng) {
  const first = simulateRivalMatch(lower, higher, rng);
  const second = simulateRivalMatch(higher, lower, rng);
  const aggHigher = first.ag + second.hg, aggLower = first.hg + second.ag;
  const winner = aggHigher > aggLower ? higher : aggLower > aggHigher ? lower
    : breakTie(rivalStrength(higher), rivalStrength(lower), rng) === "a" ? higher : lower;
  return { legs: [{ home: lower.name, away: higher.name, hg: first.hg, ag: first.ag }, { home: higher.name, away: lower.name, hg: second.hg, ag: second.ag }], winner: winner.name };
}

// A final between two rivals at a neutral ground: whoever is drawn as the
// nominal home side gets no advantage from it.
export function rivalFinal(a, b, rng) {
  const one = simulateRivalMatch(a, b, rng);
  const two = simulateRivalMatch(b, a, rng);
  const ga = Math.round((one.hg + two.ag) / 2), gb = Math.round((one.ag + two.hg) / 2);
  const winner = ga > gb ? a : gb > ga ? b : breakTie(rivalStrength(a), rivalStrength(b), rng) === "a" ? a : b;
  return { home: a.name, away: b.name, hg: ga, ag: gb, winner: winner.name };
}

// The play-offs with no user in them, played out in one go at the window.
export function rivalPlayoffs(table, opponents, seasonSeed) {
  const club = (name) => opponents.find((o) => o.name === name);
  const [[a, b], [c, d]] = playoffDraw(table);
  const rng = playoffRng(seasonSeed, "final");
  const one = rivalTie(club(a), club(b), rng);
  const two = rivalTie(club(c), club(d), rng);
  const final = rivalFinal(club(one.winner), club(two.winner), rng);
  return { semis: [one, two], final, winner: final.winner };
}

// The user's strength against a rival's for a tie-break: the same blend the
// match itself uses, attack and defence averaged.
export function userStrength(profile) {
  return (profile.attack + profile.defSolidity) / 2;
}
