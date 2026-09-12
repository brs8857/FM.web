// @vitest-environment node
import { describe, it, expect } from "vitest";
import { selectEraIndex, liveAssignments } from "./selectors.js";

describe("selectors", () => {
  it("filters the club-season index to the era", () => {
    const index = [{ y: "1999", c: "1" }, { y: "2000", c: "1" }, { y: "2011", c: "2" }, { y: "2012", c: "2" }];
    expect(selectEraIndex(index, 2000, 2011).map((e) => e.y)).toEqual(["2000", "2011"]);
  });

  it("turns role keys into role objects", () => {
    const live = liveAssignments([
      { type: "ST", role: "POA" },
      { type: "ST", role: null },
      { type: "ST", role: "NOPE" },
    ]);
    expect(live[0].role.label).toBe("Poacher");
    expect(live[1].role).toBeNull();
    expect(live[2].role).toBeNull();
  });
});
