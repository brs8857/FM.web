// @vitest-environment node
import { describe, it, expect } from "vitest";
import { createRng } from "./rng.js";
import { nextDivisions, strongest, weakest, rivalCount, TOP, CHAMPIONSHIP } from "./divisions.js";
import { playoffDraw, rivalTie, rivalFinal, rivalPlayoffs, breakTie } from "./playoffs.js";
import { USER_TEAM, USER_TEAM_NAME, seasonTier, seasonWeeks, halfSeason } from "./season.js";

const club = (prefix, i, ov) => ({ name: `${prefix} ${i}`, ov, lastSeason: "2025", histMean: ov, histStd: 3, weight: 1, vol: 8 });
const tops = (n) => Array.from({ length: n }, (_, i) => club("Top", i + 1, 90 - i));
const champs = (n) => Array.from({ length: n }, (_, i) => club("Champ", i + 1, 70 - i));
const minnows = Array.from({ length: 8 }, (_, i) => club("Minnow", i + 1, 50 - i));

// A final table with the user at `userPos` and the rivals in list order.
function tableWith(rivals, userPos) {
  const rows = rivals.map((r) => ({ name: r.name, isUser: false }));
  rows.splice(userPos - 1, 0, { name: USER_TEAM_NAME, isUser: true });
  return rows.map((r, i) => ({ ...r, position: i + 1 }));
}

const names = (list) => list.map((c) => c.name);
const disjoint = (...lists) => new Set(lists.flatMap(names)).size === lists.reduce((n, l) => n + l.length, 0);

describe("the season's length follows the division", () => {
  it("is every rival home and away", () => {
    expect([rivalCount(TOP), rivalCount(CHAMPIONSHIP)]).toEqual([19, 23]);
    expect([seasonWeeks(19), halfSeason(19), seasonWeeks(23), halfSeason(23)]).toEqual([38, 19, 46, 23]);
  });

  it("files a Championship season under its own verdicts", () => {
    const at = (position, w = 20) => seasonTier({ w, l: 5, pts: 70, position, division: CHAMPIONSHIP, weeks: 46 }).name;
    expect([at(1), at(2), at(3), at(6), at(7), at(21), at(22), at(24)]).toEqual([
      "Championship winners", "Automatic promotion", "Play-offs", "Play-offs", "Championship mid-table", "Championship mid-table",
      "Championship relegation zone", "Championship relegation zone",
    ]);
    expect(at(1, 46)).toBe("Perfect Championship season");
    expect(seasonTier({ w: 10, l: 20, pts: 30, position: 18 }).name).toBe("Relegation Battle");
  });
});

describe("nextDivisions", () => {
  it("in the top flight, swaps its bottom three rivals for three Championship clubs and keeps you up", () => {
    const opponents = tops(19), other = champs(24);
    const out = nextDivisions({ division: TOP, opponents, other, reserve: minnows, table: tableWith(opponents, 10), rng: createRng(1) });
    expect(out.division).toBe(TOP);
    expect(out.userMove).toBeNull();
    expect(out.relegated).toEqual(["Top 17", "Top 18", "Top 19"]);
    expect(out.opponents).toHaveLength(19);
    expect(out.other).toHaveLength(24);
    expect(out.other.map((c) => c.name)).toEqual(expect.arrayContaining(out.relegated));
    expect(out.opponents.filter((c) => c.lastSeason === "promoted").map((c) => c.name)).toEqual(out.promoted);
    expect(disjoint(out.opponents, out.other, out.reserve)).toBe(true);
  });

  it("sends you down with the two rivals below 17th, into a Championship of 23 rivals", () => {
    const opponents = tops(19), other = champs(24);
    const out = nextDivisions({ division: TOP, opponents, other, reserve: minnows, table: tableWith(opponents, 19), rng: createRng(2) });
    expect(out.division).toBe(CHAMPIONSHIP);
    expect(out.userMove).toBe("down");
    expect(out.relegated).toEqual(["Top 18", "Top 19"]);
    expect(out.opponents).toHaveLength(23);
    expect(out.other).toHaveLength(20);
    expect(out.opponents.map((c) => c.name)).toEqual(expect.arrayContaining(["Top 18", "Top 19"]));
    expect(disjoint(out.opponents, out.other, out.reserve)).toBe(true);
  });

  it("promotes you from the top two, with the other automatic place and the play-off winner", () => {
    const opponents = champs(23), other = tops(20);
    const table = tableWith(opponents, 2);
    const out = nextDivisions({ division: CHAMPIONSHIP, opponents, other, reserve: minnows, table, playoffWinner: "Champ 3", rng: createRng(3) });
    expect(out.division).toBe(TOP);
    expect(out.userMove).toBe("up");
    expect(out.wentUp).toEqual([USER_TEAM_NAME, "Champ 1", "Champ 3"]);
    expect(out.opponents).toHaveLength(19);
    expect(out.other).toHaveLength(24);
    expect(out.cameDown).toHaveLength(3);
    for (const name of out.cameDown) expect(names(out.other)).toContain(name);
    expect(out.relegated).toEqual(["Champ 21", "Champ 22", "Champ 23"]);
    expect(names(out.reserve)).toEqual(expect.arrayContaining(out.relegated));
    expect(disjoint(out.opponents, out.other, out.reserve)).toBe(true);
  });

  it("promotes you through the play-offs, and keeps you down otherwise, never below the Championship", () => {
    const opponents = champs(23), other = tops(20);
    const viaPlayoffs = nextDivisions({ division: CHAMPIONSHIP, opponents, other, reserve: minnows, table: tableWith(opponents, 5), playoffWinner: USER_TEAM, rng: createRng(4) });
    expect(viaPlayoffs.division).toBe(TOP);
    expect(viaPlayoffs.opponents).toHaveLength(19);
    const stay = nextDivisions({ division: CHAMPIONSHIP, opponents, other, reserve: minnows, table: tableWith(opponents, 24), playoffWinner: "Champ 4", rng: createRng(5) });
    expect(stay.division).toBe(CHAMPIONSHIP);
    expect(stay.userMove).toBeNull();
    expect(stay.opponents).toHaveLength(23);
    expect(stay.other).toHaveLength(20);
    expect(stay.relegated).toEqual(["Champ 22", "Champ 23"]);
    expect(stay.promoted).toHaveLength(2);
    expect(disjoint(stay.opponents, stay.other, stay.reserve)).toBe(true);
  });

  it("usually lifts the strong and drops the weak from the division that wasn't played", () => {
    let topThree = 0, bottomThree = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const rng = createRng(seed);
      if (names(strongest(champs(24), 3, rng)).every((n) => ["Champ 1", "Champ 2", "Champ 3", "Champ 4", "Champ 5", "Champ 6"].includes(n))) topThree++;
      if (names(weakest(tops(20), 3, rng)).every((n) => Number(n.split(" ")[1]) >= 15)) bottomThree++;
    }
    expect(topThree).toBeGreaterThan(120);
    expect(bottomThree).toBeGreaterThan(120);
    expect(topThree).toBeLessThan(200);
  });
});

describe("the play-offs", () => {
  it("draws 3rd v 6th and 4th v 5th, the user by the sentinel", () => {
    const table = tableWith(champs(23), 4);
    expect(playoffDraw(table)).toEqual([["Champ 3", "Champ 5"], [USER_TEAM, "Champ 4"]]);
  });

  it("plays a rival tie over two legs, the lower side at home first, and always finds a winner", () => {
    const a = club("A", 1, 70), b = club("B", 1, 60);
    let aWins = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const tie = rivalTie(a, b, createRng(seed));
      expect(tie.legs[0]).toMatchObject({ home: "B 1", away: "A 1" });
      expect(tie.legs[1]).toMatchObject({ home: "A 1", away: "B 1" });
      expect(["A 1", "B 1"]).toContain(tie.winner);
      if (tie.winner === "A 1") aWins++;
      const final = rivalFinal(a, b, createRng(seed + 1000));
      expect(["A 1", "B 1"]).toContain(final.winner);
    }
    expect(aWins).toBeGreaterThan(170);
  });

  it("breaks a level tie toward the stronger side, never with certainty", () => {
    let a = 0;
    for (let seed = 1; seed <= 2000; seed++) if (breakTie(80, 60, createRng(seed)) === "a") a++;
    expect(a / 2000).toBeGreaterThan(0.6);
    expect(a / 2000).toBeLessThan(0.75);
  });

  it("plays the rivals-only play-offs deterministically from the season seed", () => {
    const opponents = champs(23);
    const table = tableWith(opponents, 12);
    const one = rivalPlayoffs(table, opponents, 99);
    expect(rivalPlayoffs(table, opponents, 99)).toEqual(one);
    expect(["Champ 3", "Champ 4", "Champ 5", "Champ 6"]).toContain(one.winner);
  });
});
