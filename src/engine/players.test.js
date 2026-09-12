// @vitest-environment node
import { describe, it, expect } from "vitest";
import { makeMiniDataset } from "../../tests/fixtures/miniDataset.js";
import { STAT_KEYS, rowToPlayer, slotAccepts, createSquadLookup, buildPool } from "./players.js";

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
