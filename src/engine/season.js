import { seasonLabel } from "./util.js";
import { createRng, deriveSeed } from "./rng.js";
import { simulateMatch, simulateRivalMatch } from "./match.js";

export const USER_TEAM = "__USER__";
export const USER_TEAM_NAME = "Your XI";

// Standard "circle method" round-robin scheduler. Produces 2*(n-1) rounds for
// n teams, each round a full set of pairings, second half mirrored home/away —
// exactly how a real top-flight fixture list is constructed, rather than
// randomly grouping matches by opponent.
export function roundRobinSchedule(teamIds) {
  const n = teamIds.length;
  const fixed = teamIds[0];
  let rotating = teamIds.slice(1);
  const firstHalf = [];
  for (let r = 0; r < n - 1; r++) {
    const roundTeams = [fixed, ...rotating];
    const round = [];
    for (let i = 0; i < n / 2; i++) {
      const home = roundTeams[i], away = roundTeams[n - 1 - i];
      round.push(r % 2 === 0 ? [home, away] : [away, home]);
    }
    firstHalf.push(round);
    rotating.unshift(rotating.pop());
  }
  const secondHalf = firstHalf.map((round) => round.map(([h, a]) => [a, h]));
  return [...firstHalf, ...secondHalf];
}

export function buildUserFixtureList(opponentNamesShuffled) {
  const teams = [USER_TEAM, ...opponentNamesShuffled];
  const rounds = roundRobinSchedule(teams);
  return rounds.map((round, i) => {
    const pair = round.find(([h, a]) => h === USER_TEAM || a === USER_TEAM);
    const isHome = pair[0] === USER_TEAM;
    return { week: i + 1, name: isHome ? pair[1] : pair[0], home: isHome };
  });
}

function record(row, gf, ga) {
  row.gf += gf; row.ga += ga;
  if (gf > ga) { row.w++; row.pts += 3; }
  else if (gf === ga) { row.d++; row.pts += 1; }
  else row.l++;
}

function byStanding(a, b) {
  return b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf;
}

// Every random number in a season derives from its seed and the week, so
// fixture k's result depends only on the seed and the board before it, never
// on how many draws earlier fixtures took. Events and rival rounds each have
// their own stream, so narrating a match never changes a score.
export function fixtureRng(seasonSeed, week) { return createRng(deriveSeed(seasonSeed, week)); }
export function eventRng(seasonSeed, week) { return createRng(deriveSeed(seasonSeed, 1000 + week)); }
export function roundRng(seasonSeed, week) { return createRng(deriveSeed(seasonSeed, 2000 + week)); }

export function simulateFixture(profile, familiarity, opp, fixture, seasonSeed) {
  const res = simulateMatch(profile, opp, fixture.home, familiarity, fixtureRng(seasonSeed, fixture.week));
  const outcome = res.gf > res.ga ? "W" : res.gf === res.ga ? "D" : "L";
  return { week: fixture.week, opponent: fixture.name, home: fixture.home, gf: res.gf, ga: res.ga, outcome };
}

// The table after the user's `matches` so far. Every rival round up to the
// same week is played from the season seed, rival against rival through
// simulateRivalMatch, whatever the user's results were. Each row carries its
// record and its points after every week played.
export function leagueTable(oppList, order, matches, seasonSeed) {
  const teams = [USER_TEAM, ...order];
  const nameToOpp = Object.fromEntries(oppList.map((o) => [o.name, o]));
  const rows = Object.fromEntries(teams.map((name) => [name, {
    name: name === USER_TEAM ? USER_TEAM_NAME : name, pts: 0, isUser: name === USER_TEAM, w: 0, d: 0, l: 0, gf: 0, ga: 0, weekly: [],
  }]));
  roundRobinSchedule(teams).slice(0, matches.length).forEach((round, i) => {
    const rng = roundRng(seasonSeed, i + 1);
    for (const [home, away] of round) {
      let hg, ag;
      if (home === USER_TEAM || away === USER_TEAM) {
        const m = matches[i];
        [hg, ag] = m.home ? [m.gf, m.ga] : [m.ga, m.gf];
      } else {
        ({ hg, ag } = simulateRivalMatch(nameToOpp[home], nameToOpp[away], rng));
      }
      record(rows[home], hg, ag);
      record(rows[away], ag, hg);
    }
    for (const row of Object.values(rows)) row.weekly.push(row.pts);
  });
  const table = Object.values(rows).sort(byStanding);
  table.forEach((row, i) => { row.position = i + 1; });
  return table;
}

// A finished season from the user's 38 results: the league around them and
// the verdict. The batch and the match-by-match reducer both end here.
export function seasonResult(oppList, order, matches, seasonSeed) {
  const table = leagueTable(oppList, order, matches, seasonSeed);
  const { w, d, l, gf, ga, pts, position } = table.find((row) => row.isUser);
  const tier = seasonTier({ w, l, pts, position });
  return { matches, w, d, l, gf, ga, pts, tier, position, table };
}

// Plays the 38 fixtures in order. `lineupFor(fixture)` gives the profile and
// cohesion each is played with, so a season whose board changes week to week
// plays the same here as through the reducer.
export function playSeason(lineupFor, oppList, order, seasonSeed) {
  const nameToOpp = Object.fromEntries(oppList.map((o) => [o.name, o]));
  const matches = buildUserFixtureList(order).map((fixture) => {
    const { profile, familiarity } = lineupFor(fixture);
    return simulateFixture(profile, familiarity, nameToOpp[fixture.name], fixture, seasonSeed);
  });
  return seasonResult(oppList, order, matches, seasonSeed);
}

// The batch season, kept for sim.mjs and the golden test: draws the order and
// the season seed from the caller's rng as START_SEASON does, then plays every
// fixture with the same board.
export function simulateSeason(profile, familiarity, oppList, rng) {
  const order = rng.shuffle(oppList).map((o) => o.name);
  const seasonSeed = rng.int(2 ** 32);
  return playSeason(() => ({ profile, familiarity }), oppList, order, seasonSeed);
}

export function seasonTier({ w, l, pts, position }) {
  if (w === 38) return { name: "THE PERFECT SEASON", sub: "38 wins from 38 — a perfect season no top-flight side has ever managed.", color: "amber" };
  if (l === 0 && position === 1) return { name: "Invincibles", sub: "Champions and unbeaten from August to May — a status only one top-flight side has ever achieved.", color: "amber" };
  if (pts >= 100) return { name: "Centurions", sub: "Past the 100-point mark — a ruthless, record-breaking points total that dwarfs most title-winning campaigns.", color: "amber" };
  if (position === 1) return { name: "Champions", sub: "Crowned champions of England — the trophy, the open-top bus, the lot.", color: "emerald" };
  if (position <= 5) return { name: "Champions League", sub: "A top-five finish and Champions League football to plan for next season.", color: "sky" };
  if (position <= 7) return { name: "Europa League", sub: "European qualification secured — a genuinely solid campaign in the top half.", color: "violet" };
  if (position === 8) return { name: "Conference League", sub: "Just enough for European football — a season that overachieved its underlying numbers.", color: "violet" };
  if (position <= 17) return { name: "Mid-Table Mediocrity", sub: "Comfortable and safe, but nothing to shout about — a season that will be forgotten by August.", color: "slate" };
  return { name: "Relegation Battle", sub: "A relegation dogfight that went the wrong way — back to the drawing board.", color: "rose" };
}

export const CAREER_SEASONS = 6;
export function careerSeasonLabel(season) { return seasonLabel(2025 + season); }
