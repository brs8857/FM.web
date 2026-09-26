// @vitest-environment node
import { describe, it, expect } from "vitest";
import { makeMiniDataset } from "../../tests/fixtures/miniDataset.js";
import { createSquadLookup } from "./players.js";
import { makeInitialAssignments } from "./formations.js";
import { ROLES, defaultRoleFor, defaultDutyFor } from "./roles.js";
import { createRng } from "./rng.js";
import { weightedPick } from "./util.js";
import { matchEvents, cardScale, nextDiscipline, yellowBan, nextYellowBan } from "./match.js";

const getSquad = createSquadLookup(makeMiniDataset());
const squad = getSquad("2000", "1");
const role = (type, key) => ROLES[type].find((r) => r.key === key);
const xi = makeInitialAssignments("4-3-3").map((slot, i) => {
  const r = defaultRoleFor(slot.type);
  return { ...slot, player: squad[i], role: r, duty: defaultDutyFor(r) };
});

describe("matchEvents", () => {
  it("narrates every goal of the scoreline: our scorers, their minutes, in order", () => {
    for (let seed = 1; seed <= 300; seed++) {
      const rng = createRng(seed);
      const gf = rng.int(6), ga = rng.int(5);
      const { goals } = matchEvents({ gf, ga }, xi, createRng(seed + 10_000));
      expect(goals).toHaveLength(gf + ga);
      expect(goals.filter((g) => g.us)).toHaveLength(gf);
      const minutes = goals.map((g) => g.minute);
      expect(new Set(minutes).size).toBe(minutes.length);
      expect(minutes).toEqual([...minutes].sort((a, b) => a - b));
      for (const g of goals) {
        expect(g.minute >= 1 && g.minute <= 95).toBe(true);
        if (!g.us) { expect(g).toEqual({ minute: g.minute, us: false }); continue; }
        const scorer = xi.find((a) => a.slotId === g.slotId);
        expect(scorer.type).not.toBe("GK");
        expect(g).toMatchObject({ id: scorer.player.id, name: scorer.player.name });
      }
    }
  });

  it("replays exactly from the same stream", () => {
    expect(matchEvents({ gf: 3, ga: 2 }, xi, createRng(5))).toEqual(matchEvents({ gf: 3, ga: 2 }, xi, createRng(5)));
    expect(matchEvents({ gf: 0, ga: 0 }, xi, createRng(5)).goals).toEqual([]);
  });

  it("gives the goals to a poacher pushed up top at least ten times as often as to a blocker", () => {
    const board = xi.map((a) => {
      if (a.slotId === "ST") return { ...a, role: role("ST", "POA"), duty: "Attack" };
      if (a.type === "CB") return { ...a, role: role("CB", "NCB"), duty: "Defend" };
      return a;
    });
    const tally = { ST: 0, CB1: 0 };
    for (let seed = 1; seed <= 400; seed++) {
      const rng = createRng(seed);
      for (let week = 0; week < 38; week++) {
        for (const g of matchEvents({ gf: 1 + rng.int(3), ga: 0 }, board, rng).goals) if (g.slotId in tally) tally[g.slotId]++;
      }
    }
    expect(tally.ST).toBeGreaterThan(10 * tally.CB1);
    expect(tally.CB1).toBeGreaterThan(0);
  });

  it("falls back to any outfield starter when nobody carries an attacking weight", () => {
    const blank = xi.map((a) => ({ ...a, role: { ...a.role, att: 0 } }));
    const { goals } = matchEvents({ gf: 4, ga: 0 }, blank, createRng(3));
    expect(goals.every((g) => g.us && g.slotId !== "GK")).toBe(true);
  });
});

describe("cards", () => {
  it("books about 1.6 a match at the midpoint, more for aggressive tackling, fewer for cautious, and keepers rarely", () => {
    expect([0, 50, 100].map(cardScale)).toEqual([0.6, 1, 1.4]);
    const rate = (tackling) => {
      const rng = createRng(tackling + 1);
      let yellows = 0, reds = 0, keeper = 0;
      for (let i = 0; i < 4000; i++) {
        for (const c of matchEvents({ gf: 1, ga: 1 }, xi, rng, { tackling }).cards) {
          if (c.kind === "yellow") yellows++; else reds++;
          if (c.slotId === "GK") keeper++;
        }
      }
      return { yellows: yellows / 4000, reds: reds / 4000, keeper: keeper / 4000 };
    };
    const mid = rate(50), cautious = rate(0), aggressive = rate(100);
    expect(mid.yellows).toBeGreaterThan(1.45);
    expect(mid.yellows).toBeLessThan(1.75);
    expect(mid.reds).toBeGreaterThan(0.03);
    expect(mid.reds).toBeLessThan(0.07);
    expect(aggressive.yellows).toBeGreaterThan(mid.yellows * 1.25);
    expect(cautious.yellows).toBeLessThan(mid.yellows * 0.75);
    expect(mid.keeper).toBeLessThan(0.05);
  });

  it("never books a player twice in one match, and lists the cards in minute order", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const { cards } = matchEvents({ gf: 2, ga: 2 }, xi, createRng(seed), { tackling: 100 });
      expect(new Set(cards.map((c) => c.id)).size).toBe(cards.length);
      expect(cards.map((c) => c.minute)).toEqual([...cards.map((c) => c.minute)].sort((a, b) => a - b));
      for (const c of cards) expect(xi.find((a) => a.slotId === c.slotId).player.id).toBe(c.id);
    }
  });

  const card = (id, kind) => ({ minute: 10, slotId: "X", id, name: id, kind });
  const yellowsTo = (n, week) => {
    let d = {};
    for (let i = 0; i < n; i++) d = nextDiscipline(d, [card("vieira", "yellow")], week).discipline;
    return d;
  };

  it("bans for one match at the fifth yellow by week 19, not after", () => {
    const four = yellowsTo(4, 10);
    expect(four).toEqual({ vieira: { yellows: 4, banned: 0 } });
    const fifth = nextDiscipline(four, [card("vieira", "yellow")], 19);
    expect(fifth.discipline).toEqual({ vieira: { yellows: 5, banned: 1 } });
    expect(fifth.bans).toEqual([{ id: "vieira", name: "vieira", matches: 1 }]);
    expect(nextDiscipline(four, [card("vieira", "yellow")], 20)).toEqual({ discipline: { vieira: { yellows: 5, banned: 0 } }, bans: [] });
  });

  it("bans for two at the tenth by week 32 and three at the fifteenth", () => {
    const nine = { vieira: { yellows: 9, banned: 0 } };
    expect(nextDiscipline(nine, [card("vieira", "yellow")], 32).bans[0].matches).toBe(2);
    expect(nextDiscipline(nine, [card("vieira", "yellow")], 33).bans).toEqual([]);
    expect(nextDiscipline({ vieira: { yellows: 14, banned: 0 } }, [card("vieira", "yellow")], 38).bans[0].matches).toBe(3);
    expect(yellowBan(6, 5)).toBe(0);
    expect(nextYellowBan(4, 19)).toMatchObject({ yellows: 5 });
    expect(nextYellowBan(4, 20)).toMatchObject({ yellows: 10 });
    expect(nextYellowBan(12, 36)).toMatchObject({ yellows: 15 });
  });

  it("bans a straight red for three and a second yellow for one, without adding to the yellows", () => {
    const red = nextDiscipline({ adams: { yellows: 2, banned: 0 } }, [card("adams", "red")], 5);
    expect(red.discipline).toEqual({ adams: { yellows: 2, banned: 3 } });
    expect(red.bans[0].matches).toBe(3);
    const second = nextDiscipline({ keown: { yellows: 4, banned: 0 } }, [card("keown", "second-yellow")], 5);
    expect(second.discipline).toEqual({ keown: { yellows: 4, banned: 1 } });
  });

  it("serves a ban one match at a time and keeps the longer of two", () => {
    let d = nextDiscipline({}, [card("adams", "red")], 5).discipline;
    for (const left of [2, 1]) {
      d = nextDiscipline(d, [], 6).discipline;
      expect(d.adams.banned).toBe(left);
    }
    expect(nextDiscipline(d, [], 8)).toEqual({ discipline: {}, bans: [] });
    const overlap = nextDiscipline({ adams: { yellows: 4, banned: 3 } }, [card("adams", "yellow")], 10);
    expect(overlap.discipline.adams).toEqual({ yellows: 5, banned: 2 });
  });

  it("makes about half the reds second yellows", () => {
    let reds = 0, seconds = 0;
    for (let seed = 1; seed <= 4000; seed++) {
      for (const c of matchEvents({ gf: 0, ga: 0 }, xi, createRng(seed), { tackling: 100 }).cards) {
        if (c.kind === "red") reds++;
        if (c.kind === "second-yellow") seconds++;
      }
    }
    expect(seconds / (reds + seconds)).toBeGreaterThan(0.4);
    expect(seconds / (reds + seconds)).toBeLessThan(0.6);
  });
});

describe("weightedPick", () => {
  it("draws in proportion and never picks a zero weight", () => {
    const rng = createRng(1);
    const counts = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 6000; i++) counts[weightedPick(["a", "b", "c"], [1, 0, 2], rng)]++;
    expect(counts.b).toBe(0);
    expect(counts.c / counts.a).toBeGreaterThan(1.7);
    expect(counts.c / counts.a).toBeLessThan(2.3);
    expect(weightedPick(["a"], [0], rng)).toBeNull();
  });
});
