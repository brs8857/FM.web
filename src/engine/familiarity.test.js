// @vitest-environment node
import { describe, it, expect } from "vitest";
import { makeMiniDataset } from "../../tests/fixtures/miniDataset.js";
import { createSquadLookup } from "./players.js";
import { makeInitialAssignments } from "./formations.js";
import { defaultRoleFor, defaultDutyFor } from "./roles.js";
import { STYLE_PRESETS } from "./instructions.js";
import { identityKey } from "./tactics.js";
import { computeFamiliarity, memoryBonus, nextMemory, settling, afterMatch, systemSignature, SETTLING, EMPTY_MEMORY, MEMORY_CAP, MEMORY_CHANGE_PENALTY, MEMORY_PER_SEASON } from "./familiarity.js";

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
    expect(memory).toEqual({ ...EMPTY_MEMORY, formationKey: "4-3-3", styleKey: "Gegenpress", seasons: 1 });
    memory = nextMemory(memory, "4-3-3", "Gegenpress");
    expect(memory.seasons).toBe(2);
    memory = nextMemory({ ...memory, signature: "x", matches: 38 }, "4-3-3", "Wing Play");
    expect(memory).toEqual({ ...EMPTY_MEMORY, formationKey: "4-3-3", styleKey: "Wing Play", seasons: 1 });
    expect(nextMemory(null, "4-2-3-1", "none").seasons).toBe(1);
  });

  it("moves cohesion by exactly the memory bonus and the settling, and not at all without memory", () => {
    const base = computeFamiliarity(xi, style("gegenpress"), "4-3-3");
    expect(computeFamiliarity(xi, style("gegenpress"), "4-3-3", null)).toBe(base);
    const neutral = { ...EMPTY_MEMORY, signature: systemSignature("4-3-3", style("gegenpress")), matches: 3 };
    expect(computeFamiliarity(xi, style("gegenpress"), "4-3-3", neutral)).toBe(base);
    expect(computeFamiliarity(xi, style("gegenpress"), "4-3-3", EMPTY_MEMORY)).toBe(base + SETTLING[0]);
    const settled = { ...neutral, formationKey: "4-3-3", styleKey: "Gegenpress", seasons: 2 };
    expect(computeFamiliarity(xi, style("gegenpress"), "4-3-3", settled)).toBe(base + 4);
    expect(computeFamiliarity(xi, style("gegenpress"), "4-4-2", settled)).toBe(computeFamiliarity(xi, style("gegenpress"), "4-4-2") - 4 + SETTLING[0]);
    expect(computeFamiliarity(xi.slice(0, 10), style("gegenpress"), "4-3-3", settled)).toBe(50);
  });
});

describe("settling", () => {
  const gegen = style("gegenpress");

  it("costs on a change and at the season's first match, and pays once the system has bedded in", () => {
    let memory = EMPTY_MEMORY;
    const modifiers = [];
    for (let week = 1; week <= 9; week++) {
      const settle = settling(memory, "4-3-3", gegen);
      expect(settle.changed).toBe(false);
      modifiers.push(settle.modifier);
      memory = afterMatch(memory, settle);
    }
    expect(modifiers).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8].map((n) => SETTLING[Math.min(n, SETTLING.length - 1)]));
    expect(SETTLING[0]).toBeLessThan(0);
    expect(SETTLING.at(-1)).toBeGreaterThan(0);
    expect(memory.matches).toBe(9);
    expect(settling(memory, "4-3-3", { ...gegen, mentality: 20 })).toMatchObject({ matches: 0, modifier: SETTLING[0], changed: true });
  });

  it("reads the shape, the seven identity dials to the nearest five and the discipline, nothing else", () => {
    const sig = systemSignature("4-3-3", gegen);
    expect(systemSignature("4-3-3", { ...gegen, mentality: 61 })).toBe(systemSignature("4-3-3", { ...gegen, mentality: 62 }));
    expect(systemSignature("4-3-3", { ...gegen, focus: 10, counter: 10, crossing: 10, gkDistribution: 10, offsideTrap: false, marking: "zonal" })).toBe(sig);
    expect(systemSignature("4-3-3", { ...gegen, tackling: gegen.tackling + 5 })).not.toBe(sig);
    expect(systemSignature("4-3-3", { ...gegen, shape: "structured" })).not.toBe(sig);
    expect(systemSignature("4-4-2", gegen)).not.toBe(sig);
  });
});
