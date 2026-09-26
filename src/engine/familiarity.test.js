// @vitest-environment node
import { describe, it, expect } from "vitest";
import { makeMiniDataset } from "../../tests/fixtures/miniDataset.js";
import { createSquadLookup } from "./players.js";
import { makeInitialAssignments } from "./formations.js";
import { defaultRoleFor, defaultDutyFor } from "./roles.js";
import { STYLE_PRESETS } from "./instructions.js";
import { identityKey } from "./tactics.js";
import { computeFamiliarity, memoryBonus, nextMemory, EMPTY_MEMORY, MEMORY_CAP, MEMORY_CHANGE_PENALTY, MEMORY_PER_SEASON } from "./familiarity.js";

const getSquad = createSquadLookup(makeMiniDataset());
const xi = makeInitialAssignments("4-3-3").map((slot, i) => {
  const role = defaultRoleFor(slot.type);
  return { ...slot, player: getSquad("2000", "1")[i], role, duty: defaultDutyFor(role) };
});
const style = (key) => STYLE_PRESETS.find((s) => s.key === key).instructions;

describe("cohesion memory", () => {
  it("names the system from the instructions", () => {
    expect(identityKey(style("gegenpress"))).toBe("Gegenpress");
    expect(identityKey(style("parkbus"))).toBe("Park The Bus");
    expect(identityKey(style("balanced"))).toBe("none");
    expect(identityKey({ ...style("balanced"), mentality: 90, tempo: 90 })).toBe("bespoke");
  });

  it("adds two a season in the same shape and identity, capped at eight, and costs four on a change", () => {
    expect(MEMORY_PER_SEASON).toBe(2);
    expect(MEMORY_CAP).toBe(8);
    expect(MEMORY_CHANGE_PENALTY).toBe(4);
    expect(memoryBonus(null, "4-3-3", "Gegenpress")).toBe(0);
    expect(memoryBonus(EMPTY_MEMORY, "4-3-3", "Gegenpress")).toBe(0);
    for (const [seasons, bonus] of [[1, 2], [2, 4], [3, 6], [4, 8], [5, 8], [9, 8]]) {
      expect(memoryBonus({ formationKey: "4-3-3", styleKey: "Gegenpress", seasons }, "4-3-3", "Gegenpress"), `${seasons} seasons`).toBe(bonus);
    }
    const memory = { formationKey: "4-3-3", styleKey: "Gegenpress", seasons: 3 };
    expect(memoryBonus(memory, "4-4-2", "Gegenpress")).toBe(-4);
    expect(memoryBonus(memory, "4-3-3", "Possession Control")).toBe(-4);
  });

  it("counts consecutive seasons and restarts at one on a change", () => {
    let memory = nextMemory(EMPTY_MEMORY, "4-3-3", "Gegenpress");
    expect(memory).toEqual({ formationKey: "4-3-3", styleKey: "Gegenpress", seasons: 1 });
    memory = nextMemory(memory, "4-3-3", "Gegenpress");
    expect(memory.seasons).toBe(2);
    memory = nextMemory(memory, "4-3-3", "Wing Play");
    expect(memory).toEqual({ formationKey: "4-3-3", styleKey: "Wing Play", seasons: 1 });
    expect(nextMemory(null, "4-2-3-1", "none").seasons).toBe(1);
  });

  it("moves cohesion by exactly the memory bonus, and not at all without memory", () => {
    const base = computeFamiliarity(xi, style("gegenpress"), "4-3-3");
    expect(computeFamiliarity(xi, style("gegenpress"), "4-3-3", null)).toBe(base);
    expect(computeFamiliarity(xi, style("gegenpress"), "4-3-3", EMPTY_MEMORY)).toBe(base);
    const settled = { formationKey: "4-3-3", styleKey: "Gegenpress", seasons: 2 };
    expect(computeFamiliarity(xi, style("gegenpress"), "4-3-3", settled)).toBe(base + 4);
    expect(computeFamiliarity(xi, style("gegenpress"), "4-4-2", settled)).toBe(computeFamiliarity(xi, style("gegenpress"), "4-4-2") - 4);
    expect(computeFamiliarity(xi.slice(0, 10), style("gegenpress"), "4-3-3", settled)).toBe(50);
  });
});
