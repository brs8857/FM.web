// @vitest-environment node
import { describe, it, expect } from "vitest";
import { loadDataset } from "./loadDataset.js";

describe("loadDataset", () => {
  it("loads both archives once, into one club map and one squad map", async () => {
    const first = await loadDataset();
    const second = await loadDataset();
    expect(second).toBe(first);
    expect(first.index).toHaveLength(686);
    expect(first.index.filter((e) => e.y === "2025")).toHaveLength(20);
    expect(first.championshipIndex).toHaveLength(240);
    expect(Object.keys(first.squads)).toHaveLength(686 + 240);
    for (const e of [...first.index, ...first.championshipIndex]) expect(first.clubs[e.c], e.c).toBeDefined();
    expect(first.opponents).toHaveLength(19);
    expect(first.premier).toHaveLength(20);
    expect(first.place).toBe("Fulham FC");
    expect(first.championship.table).toHaveLength(24);
    expect(first.championship.reserve.length).toBeGreaterThan(6);
    expect(first.squads["1992_arsenal"][0][0]).toBe("Paul Merson");
    expect(first.squads["2025_arsenal"].map((r) => r[0])).toContain("Bukayo Saka");
    expect(first.squads["2019_leeds-united"].map((r) => r[0])).toContain("Kalvin Phillips");
    expect(first.squads["1992_11"]).toBeUndefined();
  });

  it("keeps the divisions apart: nobody is in both, and the rivals are the division less the club you replace", async () => {
    const d = await loadDataset();
    const premier = new Set(d.premier.map((c) => c.name));
    for (const c of [...d.championship.table, ...d.championship.reserve]) expect(premier.has(c.name), c.name).toBe(false);
    expect(d.opponents.map((o) => o.name).sort()).toEqual([...premier].filter((n) => n !== d.place).sort());
    expect(d.championship.table.map((c) => c.name)).toContain(d.championship.place);
  });
});
