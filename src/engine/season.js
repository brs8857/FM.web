import { seasonLabel } from "./util.js";
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

// Every one of the 380 fixtures is played: the user's through simulateMatch
// as before, rival against rival through its mirror. Each table row carries
// the club's real record and its points after every week.
export function simulateLeague(profile, familiarity, oppList, rng) {
  const shuffled = rng.shuffle(oppList);
  const teams = [USER_TEAM, ...shuffled.map((o) => o.name)];
  const nameToOpp = Object.fromEntries(oppList.map((o) => [o.name, o]));
  const rows = Object.fromEntries(teams.map((name) => [name, {
    name: name === USER_TEAM ? USER_TEAM_NAME : name, pts: 0, isUser: name === USER_TEAM, w: 0, d: 0, l: 0, gf: 0, ga: 0, weekly: [],
  }]));

  const matches = [];
  roundRobinSchedule(teams).forEach((round, i) => {
    for (const [home, away] of round) {
      let hg, ag;
      if (home === USER_TEAM || away === USER_TEAM) {
        const isHome = home === USER_TEAM;
        const opponent = isHome ? away : home;
        const res = simulateMatch(profile, nameToOpp[opponent], isHome, familiarity, rng);
        const outcome = res.gf > res.ga ? "W" : res.gf === res.ga ? "D" : "L";
        matches.push({ week: i + 1, opponent, home: isHome, gf: res.gf, ga: res.ga, outcome });
        [hg, ag] = isHome ? [res.gf, res.ga] : [res.ga, res.gf];
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
  return { matches, table };
}

export function simulateSeason(profile, familiarity, oppList, rng) {
  const { matches, table } = simulateLeague(profile, familiarity, oppList, rng);
  const { w, d, l, gf, ga, pts, position } = table.find((row) => row.isUser);
  const tier = seasonTier({ w, l, pts, position });
  return { matches, w, d, l, gf, ga, pts, tier, position, table };
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
