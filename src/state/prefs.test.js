import { describe, it, expect } from "vitest";
import { fakeStorage } from "../../tests/fixtures/saves.js";
import { PREFS_KEY, DEFAULT_PREFS, readPrefs, writePrefs, sanitizePrefs } from "./prefs.js";

describe("prefs", () => {
  it("defaults when there is nothing stored, storage is blocked, or the value is damaged", () => {
    expect(readPrefs(fakeStorage())).toEqual(DEFAULT_PREFS);
    expect(readPrefs(null)).toEqual(DEFAULT_PREFS);
    expect(readPrefs(fakeStorage({ [PREFS_KEY]: "{nope" }))).toEqual(DEFAULT_PREFS);
    expect(readPrefs(fakeStorage({ [PREFS_KEY]: JSON.stringify({ theme: "sepia", haptics: "yes", club: "Arsenal FC", seenNotes: ["squad", 3] }) })))
      .toEqual({ ...DEFAULT_PREFS, seenNotes: ["squad"] });
    expect(sanitizePrefs({ club: "" }).club).toBeNull();
    expect(sanitizePrefs({ club: 7 }).club).toBeNull();
    expect(sanitizePrefs({ club: "aston-villa" }).club).toBe("aston-villa");
  });

  it("round-trips a full set of preferences and drops the retired layout flag", () => {
    const storage = fakeStorage();
    const prefs = { theme: "dark", reduceMotion: "on", haptics: false, clubNames: "edited", club: "arsenal", seenNotes: ["board"] };
    expect(writePrefs(storage, { ...prefs, layout: "v2" })).toEqual(prefs);
    expect(readPrefs(storage)).toEqual(prefs);
    expect(sanitizePrefs(undefined)).toEqual(DEFAULT_PREFS);
  });
});
