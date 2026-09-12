import { clamp, seasonLabel } from "./util.js";
import { simulateMatch } from "./match.js";

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
  const teams = ["__USER__", ...opponentNamesShuffled];
  const rounds = roundRobinSchedule(teams);
  return rounds.map((round, i) => {
    const pair = round.find(([h, a]) => h === "__USER__" || a === "__USER__");
    const isHome = pair[0] === "__USER__";
    return { week: i + 1, name: isHome ? pair[1] : pair[0], home: isHome };
  });
}

// Estimated final points for the 19 real rivals, derived transparently from
// their strength rating and historical pedigree (see DATASET.opponents /
// build_final.py) rather than simulated match-by-match. `weight` (derived
// from each club's long-run mean squad strength across every real PL season
// on file) raises or lowers their expected baseline — consistently strong
// clubs get a meaningfully better weighted chance, weaker-history clubs a
// lower one. `vol` (derived from the historical spread of that same data)
// sets how much light randomisation is layered on top — volatile clubs swing
// further from their baseline, steady ones are more predictable — which is
// what leaves room for upsets without it being pure noise.
export function estimateClubPoints(opp) {
  const base = (20 + (opp.ov - 55) * 1.63) * opp.weight;
  const noise = (Math.random() - 0.5) * opp.vol;
  return Math.round(clamp(base + noise, 17, 97));
}

export function simulateSeason(profile, familiarity, oppList) {
  const shuffledNames = [...oppList].sort(() => Math.random() - 0.5).map((o) => o.name);
  const fixtures = buildUserFixtureList(shuffledNames);
  const nameToOpp = Object.fromEntries(oppList.map((o) => [o.name, o]));

  let w = 0, d = 0, l = 0, gf = 0, ga = 0;
  const matches = fixtures.map((fx) => {
    const res = simulateMatch(profile, nameToOpp[fx.name], fx.home, familiarity);
    gf += res.gf; ga += res.ga;
    let outcome;
    if (res.gf > res.ga) { w++; outcome = "W"; }
    else if (res.gf === res.ga) { d++; outcome = "D"; }
    else { l++; outcome = "L"; }
    return { week: fx.week, opponent: fx.name, home: fx.home, gf: res.gf, ga: res.ga, outcome };
  });

  const pts = w * 3 + d;

  const table = oppList.map((o) => ({ name: o.name, pts: estimateClubPoints(o), isUser: false }));
  table.push({ name: "Your XI", pts, isUser: true, w, d, l, gf, ga });
  table.sort((a, b) => b.pts - a.pts);
  const position = table.findIndex((t) => t.isUser) + 1;
  table.forEach((row, i) => { row.position = i + 1; });

  const tier = seasonTier({ w, l, pts, position });

  return { matches, w, d, l, gf, ga, pts, tier, position, table };
}

export function seasonTier({ w, l, pts, position }) {
  if (w === 38) return { name: "THE PERFECT SEASON", sub: "38 from 38 — a perfect points-per-game record with games to spare. No side in the league's history has ever managed it.", color: "amber" };
  if (l === 0 && position === 1) return { name: "Invincibles", sub: "Champions and unbeaten from August to May — a status only one Premier League side has ever achieved.", color: "amber" };
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
