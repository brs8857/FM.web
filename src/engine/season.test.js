// @vitest-environment node
import { describe, it, expect } from "vitest";
import { roundRobinSchedule, buildUserFixtureList, seasonTier, careerSeasonLabel, CAREER_SEASONS, simulateSeason } from "./season.js";
import { applyPromotionRelegation } from "./league.js";
import { createRng } from "./rng.js";

describe("fixtures", () => {
  it("schedules 38 rounds where every ordered home/away pair happens exactly once", () => {
    const teams = Array.from({ length: 20 }, (_, i) => `T${i}`);
    const rounds = roundRobinSchedule(teams);
    expect(rounds).toHaveLength(38);
    const seen = new Map();
    for (const round of rounds) {
      expect(round).toHaveLength(10);
      expect(new Set(round.flat()).size).toBe(20);
      for (const [h, a] of round) seen.set(`${h}>${a}`, (seen.get(`${h}>${a}`) || 0) + 1);
    }
    expect(seen.size).toBe(380);
    expect([...seen.values()].every((n) => n === 1)).toBe(true);
  });

  it("gives the user each opponent once at home and once away, alternating in the first half", () => {
    const names = Array.from({ length: 19 }, (_, i) => `Rival ${i + 1}`);
    const fixtures = buildUserFixtureList(names);
    expect(fixtures).toHaveLength(38);
    for (const name of names) {
      const games = fixtures.filter((f) => f.name === name);
      expect(games.map((g) => g.home).sort()).toEqual([false, true]);
    }
    expect(fixtures.slice(0, 4).map((f) => f.home)).toEqual([true, false, true, false]);
  });
});

describe("season tiers", () => {
  it.each([
    [{ w: 38, l: 0, pts: 114, position: 1 }, "THE PERFECT SEASON"],
    [{ w: 30, l: 0, pts: 98, position: 1 }, "Invincibles"],
    [{ w: 33, l: 1, pts: 100, position: 2 }, "Centurions"],
    [{ w: 28, l: 4, pts: 90, position: 1 }, "Champions"],
    [{ w: 22, l: 8, pts: 74, position: 5 }, "Champions League"],
    [{ w: 20, l: 10, pts: 68, position: 7 }, "Europa League"],
    [{ w: 18, l: 11, pts: 62, position: 8 }, "Conference League"],
    [{ w: 12, l: 14, pts: 48, position: 17 }, "Mid-Table Mediocrity"],
    [{ w: 8, l: 20, pts: 34, position: 18 }, "Relegation Battle"],
  ])("%o → %s", (input, name) => {
    expect(seasonTier(input).name).toBe(name);
  });

  // The golden season recordings never reach these two outcomes (no 38-win or
  // unbeaten-champion season among the 20 seeds), so their text is frozen here
  // instead. Strings copied from v1 (6495fb8:src/App.jsx:754-755).
  it("keeps the full tier object for the two outcomes the recordings never reach", () => {
    expect(seasonTier({ w: 38, l: 0, pts: 114, position: 1 })).toEqual({
      name: "THE PERFECT SEASON",
      sub: "38 from 38 — a perfect points-per-game record with games to spare. No side in the league's history has ever managed it.",
      color: "amber",
    });
    expect(seasonTier({ w: 30, l: 0, pts: 98, position: 1 })).toEqual({
      name: "Invincibles",
      sub: "Champions and unbeaten from August to May — a status only one Premier League side has ever achieved.",
      color: "amber",
    });
  });

  it("labels career seasons from 2026-27", () => {
    expect(CAREER_SEASONS).toBe(6);
    expect(careerSeasonLabel(1)).toBe("2026-27");
    expect(careerSeasonLabel(6)).toBe("2031-32");
  });
});

describe("promotion and relegation", () => {
  const opponents = Array.from({ length: 19 }, (_, i) => ({ name: `Rival ${i + 1}` }));
  const pool = Array.from({ length: 24 }, (_, i) => ({ name: `Challenger ${i + 1}` }));

  it("changes nothing without a table", () => {
    expect(applyPromotionRelegation(opponents, null, pool, createRng(1))).toEqual({ opponents, relegated: [], promoted: [] });
  });

  it("relegates rivals finishing 18th-20th (never the user) and keeps 19 rivals", () => {
    const table = [...opponents.map((o, i) => ({ name: o.name, isUser: false, position: i + 2 })), { name: "Your XI", isUser: true, position: 1 }];
    const result = applyPromotionRelegation(opponents, table, pool, createRng(1));
    expect(result.relegated).toEqual(["Rival 17", "Rival 18", "Rival 19"]);
    expect(result.promoted).toHaveLength(3);
    expect(result.opponents).toHaveLength(19);
  });
});

describe("bug #1: promotion never brings back a club relegated in the same summer", () => {
  it("holds across 200 seeded transitions", () => {
    const pool = Array.from({ length: 24 }, (_, i) => ({ name: `Club ${i + 1}` }));
    const opponents = pool.slice(0, 19); // rivals share names with the Championship pool, as West Ham and Wolves do
    for (let seed = 1; seed <= 200; seed++) {
      const rng = createRng(seed);
      const order = rng.shuffle(opponents);
      const table = [...order.map((o, i) => ({ name: o.name, isUser: false, position: i + 2 })), { name: "Your XI", isUser: true, position: 1 }];
      const { relegated, promoted, opponents: next } = applyPromotionRelegation(opponents, table, pool, rng);
      expect(promoted.filter((name) => relegated.includes(name)), `seed ${seed}`).toEqual([]);
      expect(next).toHaveLength(19);
    }
  });
});

describe("simulateSeason with an rng", () => {
  const opponents = Array.from({ length: 19 }, (_, i) => ({ name: `Rival ${i + 1}`, ov: 70 + i, histMean: 72, weight: 1, vol: 8 }));
  const profile = { attack: 80, defense: 78, defSolidity: 76, buildup: 70, press: 70, creativity: 72, physical: 75 };

  it("replays exactly for the same seed and differs for another", () => {
    const a = simulateSeason(profile, 65, opponents, createRng(9));
    const b = simulateSeason(profile, 65, opponents, createRng(9));
    const c = simulateSeason(profile, 65, opponents, createRng(10));
    expect(b).toEqual(a);
    expect(c.matches.map((m) => `${m.gf}-${m.ga}`)).not.toEqual(a.matches.map((m) => `${m.gf}-${m.ga}`));
  });
});
