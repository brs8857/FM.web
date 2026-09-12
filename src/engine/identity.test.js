// @vitest-environment node
import { describe, it, expect } from "vitest";
import { makeMiniDataset } from "../../tests/fixtures/miniDataset.js";
import { createSquadLookup } from "./players.js";
import { playerIdentity, isSameRealPlayer, isOwnedIdentity } from "./identity.js";

const getSquad = createSquadLookup(makeMiniDataset());
const find = (year, club, name) => getSquad(year, club).find((p) => p.name === name);

describe("player identity", () => {
  it("derives birth year from season and age", () => {
    expect(playerIdentity(find("2000", "1", "Sam Twice"))).toEqual({ name: "Sam Twice", nat: "Wales", birthYear: 1975 });
    expect(playerIdentity({ name: "No Age", nat: "Spain", age: 0, seasonKey: "2003_5" }).birthYear).toBeNull();
  });

  it("treats the same player in consecutive seasons as one person", () => {
    expect(isSameRealPlayer(playerIdentity(find("2000", "1", "Sam Twice")), playerIdentity(find("2001", "1", "Sam Twice")))).toBe(true);
  });

  it("allows one year of birthday drift but not more", () => {
    const base = { name: "X", nat: "England", birthYear: 1980 };
    expect(isSameRealPlayer(base, { ...base, birthYear: 1981 })).toBe(true);
    expect(isSameRealPlayer(base, { ...base, birthYear: 1982 })).toBe(false);
    expect(isSameRealPlayer(base, { ...base, nat: "Wales" })).toBe(false);
    expect(isSameRealPlayer(base, { ...base, birthYear: null })).toBe(true);
  });

  it("keeps two different people who share a name and nationality apart", () => {
    const older = playerIdentity(find("2000", "2", "Alan Smith"));
    const younger = playerIdentity(find("2010", "4", "Alan Smith"));
    expect([older.birthYear, younger.birthYear]).toEqual([1972, 1985]);
    expect(isSameRealPlayer(older, younger)).toBe(false);
    expect(isOwnedIdentity([older], find("2010", "4", "Alan Smith"))).toBe(false);
    expect(isOwnedIdentity([older], find("2000", "2", "Alan Smith"))).toBe(true);
  });
});
