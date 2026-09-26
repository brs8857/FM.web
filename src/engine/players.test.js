// @vitest-environment node
import { describe, it, expect } from "vitest";
import { makeMiniDataset } from "../../tests/fixtures/miniDataset.js";
import { STAT_KEYS, rowToPlayer, slotAccepts, createSquadLookup, buildPool, ageDrift, progressPlayer, retires, RETIREMENT_AGE, ovFromStats } from "./players.js";
import { playerIdentity } from "./identity.js";
import { createRng } from "./rng.js";

describe("players", () => {
  it("maps a data row to a player", () => {
    const p = rowToPlayer(["Tony Adams", "CB", "", 26, "England", 91, 87, 76, 82, 73, 96, 96], "1992_11");
    expect(p).toEqual({
      id: "1992_11__Tony Adams__91__CB", name: "Tony Adams", slot: "CB", side: null, age: 26, nat: "England", ov: 91,
      stats: { pace: 87, shooting: 76, passing: 82, dribbling: 73, defending: 96, physical: 96 }, seasonKey: "1992_11",
    });
    expect(STAT_KEYS).toHaveLength(6);
    expect(slotAccepts("ANY", p)).toBe(true);
    expect(slotAccepts("GK", p)).toBe(false);
  });

  it("caches squads per club-season and returns [] for unknown keys", () => {
    const getSquad = createSquadLookup(makeMiniDataset());
    expect(getSquad("2000", "1")).toBe(getSquad(2000, 1));
    expect(getSquad("1990", "9")).toEqual([]);
  });

  it("builds a strict-position pool, side-matched first then by rating, excluding drafted players", () => {
    const getSquad = createSquadLookup(makeMiniDataset());
    const { players: all, relaxed } = buildPool(getSquad, "2000", "1", "FB", "R", new Set());
    expect(relaxed).toBe(false);
    expect(all.every((p) => p.slot === "FB")).toBe(true);
    expect(all[0].side).toBe("R");
    const lefts = all.filter((p) => p.side === "L");
    expect(lefts[0].ov).toBeGreaterThanOrEqual(lefts[1].ov);

    const without = buildPool(getSquad, "2000", "1", "FB", "R", new Set([all[0].id]));
    expect(without.players.map((p) => p.id)).not.toContain(all[0].id);
  });

  it("relaxes to the whole squad when no player of that position is left", () => {
    const getSquad = createSquadLookup(makeMiniDataset());
    const { players, relaxed } = buildPool(getSquad, "2005", "3", "DM", null, new Set());
    expect(relaxed).toBe(true);
    expect(players.length).toBe(getSquad("2005", "3").length);
  });
});

describe("bug #4: pools exclude players already owned in another season", () => {
  const getSquad = createSquadLookup(makeMiniDataset());
  const find = (y, c, name) => getSquad(y, c).find((p) => p.name === name);

  it("drops the same person from a later season but keeps a namesake", () => {
    const owned = [playerIdentity(find("2000", "1", "Sam Twice")), playerIdentity(find("2000", "2", "Alan Smith"))];
    const later = buildPool(getSquad, "2001", "1", "ST", null, new Set(), owned).players.map((p) => p.name);
    expect(later).not.toContain("Sam Twice");
    const namesake = buildPool(getSquad, "2010", "4", "ST", null, new Set(), owned).players.map((p) => p.name);
    expect(namesake).toContain("Alan Smith");
  });
});

describe("ageing", () => {
  const ages = Array.from({ length: 26 }, (_, i) => 15 + i);
  const general = (age) => ageDrift(age).general;
  const pace = (age) => ageDrift(age).general + ageDrift(age).pace;

  it("grows until the mid-twenties, holds at 26-29, then declines ever faster", () => {
    for (const age of ages.filter((a) => a <= 25)) expect(general(age), `age ${age}`).toBeGreaterThan(0);
    for (const age of [26, 27, 28, 29]) expect(ageDrift(age)).toEqual({ general: 0, pace: 0 });
    for (const age of ages.filter((a) => a >= 30)) expect(general(age), `age ${age}`).toBeLessThan(0);
    for (let age = 16; age <= 29; age++) expect(general(age), `age ${age}`).toBeLessThanOrEqual(general(age - 1));
    for (let age = 31; age <= 40; age++) expect(general(age), `age ${age}`).toBeLessThanOrEqual(general(age - 1));
  });

  it("takes pace first: from 30 pace falls faster than the rest, never slower", () => {
    for (const age of ages.filter((a) => a < 30)) expect(ageDrift(age).pace, `age ${age}`).toBe(0);
    for (const age of ages.filter((a) => a >= 30)) expect(pace(age), `age ${age}`).toBeLessThan(general(age));
  });

  it("leaves unknown or implausible ages alone", () => {
    expect(ageDrift(null)).toEqual({ general: 0, pace: 0 });
    const odd = rowToPlayer(["Nobody", "CM", "", 0, "England", 70, 70, 70, 70, 70, 70, 70], "2008_x");
    expect(progressPlayer(odd, createRng(1))).toBe(odd);
  });

  it("moves each stat by the curve's mean within a point of noise, and the overall with the stats", () => {
    const rng = createRng(11);
    for (const startAge of [17, 23, 27, 31, 34]) {
      let player = rowToPlayer(["Someone", "ST", "", startAge, "England", 70, 70, 78, 57, 69, 48, 69], "2010_x");
      for (let season = 0; season < 5; season++) {
        const next = progressPlayer(player, rng);
        expect(next.age).toBe(player.age + 1);
        expect(next.id).toBe(player.id);
        const { general: mean, pace: extra } = ageDrift(next.age);
        for (const k of STAT_KEYS) {
          const expected = mean + (k === "pace" ? extra : 0);
          expect(Math.abs(next.stats[k] - player.stats[k] - expected), `${k} at ${next.age}`).toBeLessThanOrEqual(1.5);
        }
        expect(next.ov - player.ov).toBe(ovFromStats("ST", next.stats) - ovFromStats("ST", player.stats));
        player = next;
      }
    }
  });

  it("caps stats at the ends of the scale and keeps the overall in range", () => {
    const star = rowToPlayer(["Star", "ST", "", 19, "England", 96, 98, 99, 84, 97, 78, 93], "2024_x");
    const older = progressPlayer(star, createRng(2));
    expect(Object.values(older.stats).every((v) => v <= 99)).toBe(true);
    expect(older.ov).toBeLessThanOrEqual(99);
    let relic = rowToPlayer(["Relic", "GK", "", 34, "England", 40, 5, 3, 4, 3, 6, 5], "1992_x");
    for (let i = 0; i < 3; i++) relic = progressPlayer(relic, createRng(i));
    expect(Object.values(relic.stats).every((v) => v >= 1)).toBe(true);
    expect(relic.ov).toBeGreaterThanOrEqual(1);
  });

  it("retires at 36", () => {
    expect(RETIREMENT_AGE).toBe(36);
    expect(retires({ age: 35 })).toBe(false);
    expect(retires({ age: 36 })).toBe(true);
    expect(retires({ age: 47 })).toBe(true);
    expect(retires({ age: null })).toBe(false);
  });
});
