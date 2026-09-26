// @vitest-environment node
import { describe, it, expect } from "vitest";
import { makeMiniDataset } from "../../tests/fixtures/miniDataset.js";
import { createSquadLookup } from "./players.js";
import { makeInitialAssignments } from "./formations.js";
import { nextEmptySlotIndex, autoFillBench, generateShortlist, signToSlot, signToBench, progressSquad, wageCost, windowBudget, budgetLeft, WINDOW_CANDIDATES } from "./squad.js";
import { createRng } from "./rng.js";
import { playerIdentity, isSameRealPlayer } from "./identity.js";

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

  it("costs a candidate by rating band and sets the budget by last season's finish", () => {
    expect([95, 90, 89, 84, 83, 78, 77, 72, 71, 40].map((ov) => wageCost({ ov }))).toEqual([5, 5, 4, 4, 3, 3, 2, 2, 1, 1]);
    expect([1, 2, 4, 5, 7, 8, 17, 18, 20].map(windowBudget)).toEqual([9, 8, 8, 7, 7, 6, 6, 5, 5]);
    expect(budgetLeft({ points: 7, spent: 4 })).toBe(3);
    expect(budgetLeft(null)).toBe(0);
  });

  it("builds a shortlist of eight from the chosen era, excluding owned players", () => {
    const owned = new Set(getSquad("2000", "1").slice(0, 5).map((p) => p.id));
    const list = generateShortlist(getSquad, dataset.index, { eraMin: 2000, eraMax: 2001 }, owned, createRng(7));
    expect(list).toHaveLength(WINDOW_CANDIDATES);
    expect(WINDOW_CANDIDATES).toBe(8);
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

describe("bug #4: bench and shortlist never duplicate a real player", () => {
  it("autoFillBench skips an owned identity from another drafted season", () => {
    const sam2000 = getSquad("2000", "1").find((p) => p.name === "Sam Twice");
    const squad2001 = getSquad("2001", "1");
    const assignments = makeInitialAssignments("4-3-3").map((a, i) => ({ ...a, player: i === 10 ? sam2000 : squad2001[i + 1] }));
    const drafted = new Set(assignments.map((a) => a.player.id));
    const { bench } = autoFillBench(getSquad, assignments, drafted, assignments.map((a) => playerIdentity(a.player)));
    expect(bench.map((b) => b.player.name)).not.toContain("Sam Twice");
  });

  it("generateShortlist excludes owned identities and repeats nobody", () => {
    const owned = [playerIdentity(getSquad("2000", "1").find((p) => p.name === "Sam Twice"))];
    for (let seed = 1; seed <= 30; seed++) {
      const list = generateShortlist(getSquad, dataset.index, { eraMin: 2000, eraMax: 2011 }, new Set(), createRng(seed), { count: 20, ownedIdentities: owned });
      expect(list.map((p) => p.name)).not.toContain("Sam Twice");
      const ids = list.map(playerIdentity);
      ids.forEach((a, i) => ids.slice(i + 1).forEach((b) => expect(isSameRealPlayer(a, b)).toBe(false)));
    }
  });
});

describe("the summer", () => {
  const withAge = (player, age) => ({ ...player, age });

  it("ages everyone a year, retires the bench first, and fills a retiring starter's place from the bench", () => {
    const squad = getSquad("2000", "1");
    const assignments = makeInitialAssignments("4-3-3").map((a, i) => ({ ...a, player: withAge(squad[i], a.slotId === "ST" ? 35 : 27), role: "X", duty: "Y", sliderAtt: 70, sliderDef: 30 }));
    const st = assignments.find((a) => a.slotId === "ST");
    const others = getSquad("2001", "2");
    const spareStrikers = others.filter((p) => p.slot === "ST");
    const bench = [
      entry(withAge(others.find((p) => p.slot === "GK"), 35)),
      entry(withAge(spareStrikers[0], 30)),
      entry(withAge(spareStrikers[1], 24)),
      entry(withAge(others.find((p) => p.slot === "CB"), 28)),
    ];
    const better = spareStrikers[0].ov >= spareStrikers[1].ov ? spareStrikers[0] : spareStrikers[1];
    const result = progressSquad(assignments, bench, createRng(3));
    expect(result.retired).toEqual([bench[0].player.name, st.player.name]);
    expect(result.bench).toHaveLength(2);
    for (const b of result.bench) expect(b.player.age).toBe(bench.find((x) => x.player.id === b.player.id).player.age + 1);
    const newSt = result.assignments.find((a) => a.slotId === "ST");
    expect(newSt.player.id).toBe(better.id);
    expect(newSt).toMatchObject({ role: "POA", duty: "Attack", sliderAtt: 50, sliderDef: 50 });
    for (const a of result.assignments.filter((x) => x.slotId !== "ST")) {
      expect(a.player.age).toBe(28);
      expect(a).toMatchObject({ role: "X", duty: "Y", sliderAtt: 70, sliderDef: 30 });
    }
  });

  it("leaves a starter's slot empty when nobody on the bench fits, and a keeper's slot only takes a keeper", () => {
    const squad = getSquad("2000", "1");
    const assignments = makeInitialAssignments("4-3-3").map((a, i) => ({ ...a, player: withAge(squad[i], a.type === "GK" ? 36 : 26) }));
    const outfield = entry(withAge(getSquad("2001", "2").find((p) => p.slot === "CM"), 25));
    const result = progressSquad(assignments, [outfield], createRng(1));
    expect(result.retired).toEqual([squad[0].name]);
    expect(result.assignments[0]).toMatchObject({ slotId: "GK", player: null, role: null, duty: null });
    expect(result.bench).toHaveLength(1);
    const fbSlot = assignments.find((a) => a.type === "FB").slotId;
    const fb = makeInitialAssignments("4-3-3").map((a, i) => ({ ...a, player: withAge(squad[i], a.slotId === fbSlot ? 37 : 26) }));
    const filled = progressSquad(fb, [outfield], createRng(1));
    expect(filled.assignments.find((a) => a.slotId === fbSlot).player.id).toBe(outfield.player.id);
    expect(filled.bench).toEqual([]);
  });
});
