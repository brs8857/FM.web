// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import edited from "./clubs.json";
import { clubName, clubSeasonLabel } from "./clubs.js";
import { rekeyDataset, slugFor } from "../../scripts/rekey-clubs.mjs";

const players = JSON.parse(readFileSync("src/data/players.json", "utf8"));
const championship = JSON.parse(readFileSync("src/data/championship.json", "utf8"));

describe("club names", () => {
  it("shows real names by default and edited names on request, falling back when none exists", () => {
    expect(clubName("Arsenal FC")).toBe("Arsenal");
    expect(clubName("AFC Bournemouth")).toBe("Bournemouth");
    expect(clubName("Sunderland AFC")).toBe("Sunderland");
    expect(clubName("Wimbledon FC (- 2004)")).toBe("Wimbledon");
    expect(clubName("Arsenal FC", "edited")).toBe("Islington Reds");
    expect(clubName("Rival 3", "edited")).toBe("Rival 3");
    expect(clubSeasonLabel(players, "2000_leeds-united")).toBe("Leeds United 2000-01");
    expect(clubSeasonLabel(players, "2000_leeds-united", "edited")).toBe("Leeds Whites 2000-01");
  });

  it("has an edited name for every club in the dataset, the opposition and the promotion pool", () => {
    const names = new Set([...Object.values(players.clubs), ...players.opponents.map((o) => o.name), ...championship.map((c) => c.name)]);
    for (const name of names) expect(edited[name], name).toBeTruthy();
    const editedNames = Object.values(edited);
    expect(editedNames.every((n) => /^[A-Z]/.test(n))).toBe(true);
  });
});

describe("club keys", () => {
  it("are slugs throughout the dataset, and the legacy map covers every old id", () => {
    const legacy = JSON.parse(readFileSync("src/data/legacyClubIds.json", "utf8"));
    for (const id of Object.keys(players.clubs)) expect(id).toMatch(/^[a-z][a-z0-9-]*$/);
    for (const key of Object.keys(players.squads)) expect(key).toMatch(/^\d{4}_[a-z][a-z0-9-]*$/);
    for (const entry of players.index) expect(players.clubs[entry.c], entry.c).toBeDefined();
    expect(new Set(Object.values(legacy)).size).toBe(Object.keys(legacy).length);
    for (const slug of Object.values(legacy)) expect(players.clubs[slug]).toBeDefined();
    expect(legacy["11"]).toBe("arsenal");
  });

  it("derives slugs from names and rekeys a numeric dataset once", () => {
    expect(slugFor("Wimbledon FC (- 2004)")).toBe("wimbledon");
    expect(slugFor("Brighton & Hove Albion")).toBe("brighton-and-hove-albion");
    const { data, map } = rekeyDataset({ clubs: { 7: "Test FC", ok: "Kept" }, squads: { "1999_7": [], "1999_ok": [] }, index: [{ y: "1999", c: "7", label: "x" }] });
    expect(map).toEqual({ 7: "test" });
    expect(Object.keys(data.squads)).toEqual(["1999_test", "1999_ok"]);
    expect(data.index[0].c).toBe("test");
    expect(rekeyDataset(data).map).toEqual({});
  });
});
