import { USER_TEAM, USER_TEAM_NAME } from "./season.js";

// The two divisions a career moves between (spec 09). The top flight has
// twenty clubs and the Championship twenty-four; your XI takes one place in
// whichever it is in, so its rivals number 19 or 23. The division you are
// not in is kept whole, and a reserve of real clubs with Championship
// squads on file stands in for League One.
export const TOP = "top";
export const CHAMPIONSHIP = "championship";
export const DIVISION_CLUBS = { [TOP]: 20, [CHAMPIONSHIP]: 24 };
export const RELEGATION_PLACES = 3;
export const AUTOMATIC_PROMOTION = 2;
export const PLAYOFF_PLACES = [3, 6];

export function rivalCount(division) {
  return DIVISION_CLUBS[division] - 1;
}

// The lines a final table is ruled with: under the automatic places and the
// play-off places in the Championship, above the bottom three in both.
export function tableRule(division, position) {
  const clubs = DIVISION_CLUBS[division];
  if (position === clubs - RELEGATION_PLACES) return "solid";
  if (division !== CHAMPIONSHIP) return null;
  if (position === AUTOMATIC_PROMOTION) return "solid";
  if (position === PLAYOFF_PLACES[1]) return "dashed";
  return null;
}

const byName = (names) => (club) => names.includes(club.name);
const notIn = (names) => (club) => !names.includes(club.name);

// Clubs going up or down from a division that wasn't played: ranked on
// strength with a club-sized dose of luck, so the strong usually rise and
// the weak usually fall, but not always.
function ranked(clubs, rng) {
  return clubs.map((c) => ({ c, key: c.ov + (rng.next() - 0.5) * (4 + (c.vol ?? 8) / 2) })).sort((a, b) => b.key - a.key).map((x) => x.c);
}

export function strongest(clubs, count, rng) {
  return ranked(clubs, rng).slice(0, count);
}

export function weakest(clubs, count, rng) {
  return ranked(clubs, rng).slice(-count);
}

// The season's movement, your club included: the division you were in was
// played, so its table decides; the other is decided by `strongest` and
// `weakest`. `playoffWinner` is the play-off final's winner when the season
// was in the Championship (USER_TEAM when it was you).
export function nextDivisions({ division, opponents, other, reserve, table, playoffWinner = null, rng }) {
  const userPos = table.find((r) => r.isUser).position;
  const rivals = table.filter((r) => !r.isUser);
  if (division === TOP) {
    const down = rivals.filter((r) => r.position > DIVISION_CLUBS[TOP] - RELEGATION_PLACES).map((r) => r.name);
    const userDown = userPos > DIVISION_CLUBS[TOP] - RELEGATION_PLACES;
    const up = strongest(other, RELEGATION_PLACES, rng);
    const top = [...opponents.filter(notIn(down)), ...up.map((c) => ({ ...c, lastSeason: "promoted" }))];
    const champ = [...other.filter(notIn(up.map((c) => c.name))), ...opponents.filter(byName(down))];
    return {
      division: userDown ? CHAMPIONSHIP : TOP,
      opponents: userDown ? champ : top,
      other: userDown ? top : champ,
      reserve,
      userMove: userDown ? "down" : null,
      relegated: down, promoted: up.map((c) => c.name),
    };
  }
  const autos = rivals.filter((r) => r.position <= AUTOMATIC_PROMOTION).map((r) => r.name);
  const userUp = userPos <= AUTOMATIC_PROMOTION || playoffWinner === USER_TEAM;
  const wentUp = [...autos, ...(playoffWinner && playoffWinner !== USER_TEAM ? [playoffWinner] : [])];
  const cameDown = weakest(other, RELEGATION_PLACES, rng);
  const toLeagueOne = rivals.filter((r) => r.position > DIVISION_CLUBS[CHAMPIONSHIP] - RELEGATION_PLACES).map((r) => r.name);
  const fromLeagueOne = strongest(reserve, toLeagueOne.length, rng);
  const champ = [
    ...opponents.filter(notIn([...wentUp, ...toLeagueOne])),
    ...cameDown.map((c) => ({ ...c, lastSeason: "relegated" })),
    ...fromLeagueOne.map((c) => ({ ...c, lastSeason: "promoted" })),
  ];
  const top = [...other.filter(notIn(cameDown.map((c) => c.name))), ...opponents.filter(byName(wentUp)).map((c) => ({ ...c, lastSeason: "promoted" }))];
  return {
    division: userUp ? TOP : CHAMPIONSHIP,
    opponents: userUp ? top : champ,
    other: userUp ? champ : top,
    reserve: [...reserve.filter(notIn(fromLeagueOne.map((c) => c.name))), ...opponents.filter(byName(toLeagueOne))],
    userMove: userUp ? "up" : null,
    relegated: toLeagueOne, promoted: fromLeagueOne.map((c) => c.name),
    wentUp: userUp ? [USER_TEAM_NAME, ...wentUp] : wentUp, cameDown: cameDown.map((c) => c.name),
  };
}
