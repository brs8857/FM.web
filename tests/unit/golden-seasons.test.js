// @vitest-environment node
import { describe, it, expect } from "vitest";
import seasons from "../golden/seasons.json";
import league from "../golden/league.json";
import players from "../../src/data/players.json";
import championship from "../../src/data/championship.json";
import { withSeededMathRandom } from "../../scripts/capture-golden.mjs";
import { simulateSeason } from "../../src/engine/season.js";
import { applyPromotionRelegation } from "../../src/engine/league.js";

const plain = (value) => JSON.parse(JSON.stringify(value));

describe("golden: seeded season simulations match v1", () => {
  it.each(seasons.map((entry) => [entry.seed, entry]))("season seed %i", (seed, entry) => {
    const result = withSeededMathRandom(seed, () => simulateSeason(entry.profile, entry.familiarity, players.opponents));
    expect(plain(result)).toEqual(entry.result);
  });
});

describe("golden: seeded promotion/relegation matches v1", () => {
  it.each(league.map((entry) => [entry.seed, entry]))("league seed %i", (seed, entry) => {
    const result = withSeededMathRandom(seed, () => applyPromotionRelegation(players.opponents, entry.table, championship));
    expect(plain(result)).toEqual(entry.result);
  });
});
