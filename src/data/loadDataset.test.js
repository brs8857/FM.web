// @vitest-environment node
import { describe, it, expect } from "vitest";
import { loadDataset } from "./loadDataset.js";

describe("loadDataset", () => {
  it("loads players and championship data once", async () => {
    const first = await loadDataset();
    const second = await loadDataset();
    expect(second).toBe(first);
    expect(Object.keys(first.clubs)).toHaveLength(51);
    expect(Object.keys(first.squads)).toHaveLength(666);
    expect(first.index).toHaveLength(666);
    expect(first.opponents).toHaveLength(19);
    expect(first.championship).toHaveLength(24);
    expect(first.squads["1992_11"][0][0]).toBe("Paul Merson");
  });
});
