// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { splitCsv, slotFor, plainPlayerName, ageAt, valueAt, topFlightCurve, quantileMap } from "../../scripts/import-transfermarkt.mjs";

const players = JSON.parse(readFileSync("src/data/players.json", "utf8"));
const championship = JSON.parse(readFileSync("src/data/championship.json", "utf8"));

describe("import-transfermarkt", () => {
  it("splits quoted CSV fields", () => {
    expect(splitCsv('1,"Smith, John","say ""hi""",,x')).toEqual(["1", "Smith, John", 'say "hi"', "", "x"]);
  });

  it("maps positions to slots and sides", () => {
    expect(slotFor("Goalkeeper")).toEqual(["GK", ""]);
    expect(slotFor("Defender - Left-Back")).toEqual(["FB", "L"]);
    expect(slotFor("Defender - Right-Back")).toEqual(["FB", "R"]);
    expect(slotFor("Midfield - Right Midfield")).toEqual(["WIDE", "R"]);
    expect(slotFor("Attack - Left Winger")).toEqual(["WIDE", "L"]);
    expect(slotFor("Attack - Second Striker")).toEqual(["ST", ""]);
    expect(slotFor("Midfield")).toEqual(["CM", ""]);
    expect(slotFor("Defender")).toEqual(["CB", ""]);
  });

  it("strips the id from names and falls back to the slug", () => {
    expect(plainPlayerName("Wes Morgan (10003)")).toBe("Wes Morgan");
    expect(plainPlayerName("", "lewis-obrien")).toBe("Lewis Obrien");
  });

  it("measures age on 1 September and takes the value carried through the season", () => {
    expect(ageAt("1998-12-17", 2024)).toBe(25);
    expect(ageAt("1999-09-01", 2024)).toBe(25);
    expect(ageAt("1999-09-02", 2024)).toBe(24);
    expect(ageAt("", 2024)).toBeNull();
    const history = [["2024-06-01", 5e6], ["2025-01-15", 8e6], ["2025-05-30", 20e6]];
    expect(valueAt(history, 2024)).toBe(8e6);
    expect(valueAt(history, 2023)).toBe(5e6);
    expect(valueAt([], 2024)).toBeNull();
  });

  it("places a score on the top flight's curve and carries it on below the cheapest player", () => {
    const scores = Array.from({ length: 401 }, (_, i) => 13 + i / 100);
    const curve = topFlightCurve(scores);
    expect(curve(17)).toBe(96);
    expect(Math.round(curve(13))).toBe(38);
    expect(curve(15)).toBeGreaterThan(curve(14));
    expect(curve(12)).toBeLessThan(38);
    expect(curve(0)).toBe(30);
    expect(quantileMap([3, 1, 2], [40, 50, 60])).toEqual([60, 40, 50]);
  });

  it("shipped a Championship a clear step below the top flight, at one level across its seasons", () => {
    const mean = (rows) => rows.reduce((s, r) => s + r[5], 0) / rows.length;
    for (let y = 2016; y <= 2024; y++) {
      const top = Object.entries(players.squads).filter(([k]) => k.startsWith(`${y}_`)).flatMap(([, v]) => v);
      const champ = Object.entries(championship.squads).filter(([k]) => k.startsWith(`${y}_`)).flatMap(([, v]) => v);
      expect(champ.length, y).toBeGreaterThan(24 * 16);
      expect(mean(top) - mean(champ), y).toBeGreaterThan(8);
      expect(mean(top) - mean(champ), y).toBeLessThan(30);
    }
    const avg = (xs) => xs.reduce((t, x) => t + x, 0) / xs.length;
    expect(avg(championship.table.map((c) => c.ov))).toBeLessThan(avg(players.premier.map((c) => c.ov)) - 10);
    // Every season a Championship career drafts from sits at one level, so
    // the 2025-26 clubs it plays are not rated on a lower scale than its picks.
    const levels = Array.from({ length: 10 }, (_, i) => 2016 + i).map((y) => mean(Object.entries(championship.squads).filter(([k]) => k.startsWith(`${y}_`)).flatMap(([, v]) => v)));
    for (const level of levels) expect(Math.abs(level - levels[0])).toBeLessThan(1);
    expect(championship.index).toHaveLength(240);
    for (const [key, rows] of Object.entries(championship.squads)) {
      expect(rows.filter((r) => r[1] === "GK").length, key).toBeGreaterThanOrEqual(1);
      for (const r of rows) expect(r[0], key).toMatch(/\S/);
    }
  });
});
