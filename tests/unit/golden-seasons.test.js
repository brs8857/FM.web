// @vitest-environment node
import { describe, it, expect } from "vitest";
import seasons from "../golden/seasons.json";
import league from "../golden/league.json";
import players from "../../src/data/players.json";
import championship from "../../src/data/championship.json";
import { createRng } from "../../src/engine/rng.js";
import { simulateSeason } from "../../src/engine/season.js";
import { nextDivisions } from "../../src/engine/divisions.js";

const plain = (value) => JSON.parse(JSON.stringify(value));

describe("golden: seeded season simulations match v1", () => {
  it.each(seasons.map((entry) => [entry.seed, entry]))("season seed %i", (seed, entry) => {
    const result = simulateSeason(entry.profile, entry.familiarity, players.opponents, createRng(seed));
    expect(plain(result)).toEqual(entry.result);
  });
});

describe("golden: seeded promotion/relegation matches v1", () => {
  it.each(league.map((entry) => [entry.seed, entry]))("league seed %i", (seed, entry) => {
    const result = nextDivisions({ division: "top", opponents: players.opponents, other: championship.table, reserve: championship.reserve, table: entry.table, rng: createRng(seed) });
    expect(plain(result)).toEqual(entry.result);
  });
});
