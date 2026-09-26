// @vitest-environment node
import { describe, it, expect } from "vitest";
import players from "../../src/data/players.json";
import championship from "../../src/data/championship.json";
import { checkShipped, buildDataset, overallsForSeason, roundTo } from "../../scripts/derive-ratings.mjs";
import { ARCHETYPES, STAT_KEYS, statsFromOv, ovFromStats } from "../../src/engine/players.js";
import { createRng } from "../../src/engine/rng.js";

describe("derive-ratings", () => {
  it("rebuilds every club-strength field of the shipped rivals and pool from the squads", () => {
    expect(checkShipped(players, championship)).toEqual([]);
  });

  it("rounds half to even like the original pipeline", () => {
    expect(roundTo(53.25, 1)).toBe(53.2);
    expect(roundTo(53.35, 1)).toBe(53.4);
    expect(roundTo(73.79, 1)).toBe(73.8);
  });

  it("ranks a season's values into the overall range, discounting youth", () => {
    const rows = [
      { value: 1e6, age: 30 }, { value: 5e7, age: 28 }, { value: 5e7, age: 20 }, { value: 2e8, age: 26 },
    ];
    const ovs = overallsForSeason(rows);
    expect(ovs[0]).toBe(38);
    expect(ovs[3]).toBe(96);
    expect(ovs[2]).toBeLessThan(ovs[1]);
    expect(overallsForSeason([{ value: 3, age: 25 }])).toEqual([96]);
  });

  it("builds a dataset in the shipped shape from raw rows", () => {
    const clubs = { alpha: "Alpha FC", beta: "Beta United", gamma: "Gamma Town" };
    const rows = [];
    for (const year of [2022, 2023, 2024]) {
      for (const club of ["alpha", "beta"]) {
        ["GK", "CB", "FB", "DM", "CM", "AM", "WIDE", "ST"].forEach((slot, i) => {
          rows.push({ year, club, name: `${club} ${slot}`, slot, side: slot === "FB" ? "L" : "", age: 20 + i, nat: "England", value: (i + 1) * (club === "alpha" ? 2e6 : 1e6) });
        });
      }
    }
    const { players: built, championship: pool } = buildDataset({ clubs, rows, rivals: ["alpha", "beta"], pool: ["beta", { name: "Gamma Town", ov: 50, histStd: 7 }] });
    expect(Object.keys(built.squads)).toEqual(["2022_alpha", "2022_beta", "2023_alpha", "2023_beta", "2024_alpha", "2024_beta"]);
    expect(built.index[0]).toEqual({ y: "2022", c: "alpha", label: "Alpha FC 2022-23" });
    const row = built.squads["2024_alpha"][7];
    expect(row.slice(0, 5)).toEqual(["alpha ST", "ST", "", 27, "England"]);
    expect(row).toHaveLength(12);
    expect(row.slice(5).every((v) => Number.isInteger(v) && v >= 1 && v <= 99)).toBe(true);
    expect(built.opponents.map((o) => o.name)).toEqual(["Alpha FC", "Beta United"]);
    for (const club of [...built.opponents, ...pool]) {
      expect(Object.keys(club)).toEqual(expect.arrayContaining(["name", "ov", "histMean", "histStd", "weight", "vol"]));
    }
    expect(built.opponents[0].ov).toBeGreaterThan(built.opponents[1].ov);
    expect(pool[1]).toMatchObject({ name: "Gamma Town", ov: 50, histMean: 50, histStd: 7 });
    expect(buildDataset({ clubs, rows, rivals: ["alpha", "beta"], pool: ["beta"] }).players.squads).toEqual(built.squads);
  });
});

describe("archetypes", () => {
  it("cover every position with six offsets", () => {
    for (const slot of ["GK", "CB", "FB", "DM", "CM", "AM", "WIDE", "ST"]) expect(ARCHETYPES[slot]).toHaveLength(STAT_KEYS.length);
  });

  it("round-trip a rating through stats within the noise", () => {
    for (let ov = 40; ov <= 90; ov += 10) {
      for (const slot of Object.keys(ARCHETYPES)) {
        const stats = statsFromOv(slot, ov, createRng(ov * 7 + slot.length));
        expect(Math.abs(ovFromStats(slot, stats) - ov), `${slot} ${ov}`).toBeLessThanOrEqual(3);
      }
    }
  });

  it("recover the shipped overalls from the shipped stats to within a point on average", () => {
    let total = 0, count = 0, worst = 0;
    for (const rows of Object.values(players.squads)) {
      for (const row of rows) {
        const stats = Object.fromEntries(STAT_KEYS.map((k, i) => [k, row[6 + i]]));
        const err = Math.abs(ovFromStats(row[1], stats) - row[5]);
        total += err; count++; worst = Math.max(worst, err);
      }
    }
    expect(total / count).toBeLessThan(1.2);
    expect(worst).toBeLessThanOrEqual(6);
  });
});
