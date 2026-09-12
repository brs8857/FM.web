// @vitest-environment node
import { describe, it, expect } from "vitest";
import { makeMiniDataset } from "../../tests/fixtures/miniDataset.js";
import { createSquadLookup } from "./players.js";
import { makeInitialAssignments } from "./formations.js";
import { nextEmptySlotIndex, autoFillBench, generateShortlist, signToSlot, signToBench } from "./squad.js";
import { createRng } from "./rng.js";

const dataset = makeMiniDataset();
const getSquad = createSquadLookup(dataset);
const entry = (player) => ({ player, role: null, duty: null });

describe("squad", () => {
  it("finds the next empty slot", () => {
    const empty = makeInitialAssignments("4-3-3");
    expect(nextEmptySlotIndex(empty)).toBe(0);
    const squad = getSquad("2000", "1");
    expect(nextEmptySlotIndex(empty.map((a, i) => ({ ...a, player: squad[i] })))).toBe(-1);
  });

  it("auto-fills a bench of 6 from the drafted club-seasons: backup keeper first, then best outfielders", () => {
    const squad = getSquad("2000", "1");
    const assignments = makeInitialAssignments("4-3-3").map((a, i) => ({ ...a, player: squad[i + 1] }));
    const drafted = new Set(assignments.map((a) => a.player.id));
    const { bench, draftedIds } = autoFillBench(getSquad, assignments, drafted);
    expect(bench).toHaveLength(6);
    expect(bench[0].player.slot).toBe("GK");
    const outfield = bench.slice(1).map((b) => b.player.ov);
    expect([...outfield].sort((a, b) => b - a)).toEqual(outfield);
    for (const b of bench) {
      expect(drafted.has(b.player.id)).toBe(false);
      expect(draftedIds.has(b.player.id)).toBe(true);
    }
  });

  it("builds a shortlist from the chosen era, excluding owned players", () => {
    const owned = new Set(getSquad("2000", "1").slice(0, 5).map((p) => p.id));
    const list = generateShortlist(getSquad, dataset.index, { eraMin: 2000, eraMax: 2001 }, owned, createRng(7));
    expect(list).toHaveLength(5);
    for (const p of list) {
      expect(owned.has(p.id)).toBe(false);
      expect(["2000", "2001"]).toContain(p.seasonKey.split("_")[0]);
    }
  });

  it("signs to the bench, replacing the weakest when it's full", () => {
    const squad = getSquad("2001", "2");
    const six = squad.slice(0, 6).map(entry);
    const newcomer = getSquad("2006", "3")[0];
    expect(signToBench(six.slice(0, 5), newcomer)).toHaveLength(6);
    const weakest = six.reduce((min, b) => (b.player.ov < min.player.ov ? b : min));
    const after = signToBench(six, newcomer);
    expect(after).toHaveLength(6);
    expect(after.map((b) => b.player.id)).not.toContain(weakest.player.id);
    expect(after.map((b) => b.player.id)).toContain(newcomer.id);
  });

  it("signs into the XI with default role/duty and sends the old player to the bench", () => {
    const squad = getSquad("2000", "1");
    const assignments = makeInitialAssignments("4-3-3").map((a, i) => ({ ...a, player: squad[i], role: "X", duty: "Y", sliderAtt: 80 }));
    const newcomer = getSquad("2011", "4")[18];
    const outgoing = assignments.find((a) => a.slotId === "ST").player;
    const result = signToSlot(assignments, [], "ST", newcomer);
    const st = result.assignments.find((a) => a.slotId === "ST");
    expect(st).toMatchObject({ player: newcomer, role: "POA", duty: "Attack", sliderAtt: 50, sliderDef: 50 });
    expect(result.bench).toEqual([entry(outgoing)]);
  });
});
