import { describe, it, expect } from "vitest";
import { fakeStorage } from "../../tests/fixtures/saves.js";
import { PREFS_KEY, DEFAULT_PREFS, readPrefs, writePrefs, applyLayoutFlag, sanitizePrefs } from "./prefs.js";

describe("prefs", () => {
  it("defaults when there is nothing stored, storage is blocked, or the value is damaged", () => {
    expect(readPrefs(fakeStorage())).toEqual(DEFAULT_PREFS);
    expect(readPrefs(null)).toEqual(DEFAULT_PREFS);
    expect(readPrefs(fakeStorage({ [PREFS_KEY]: "{nope" }))).toEqual(DEFAULT_PREFS);
    expect(readPrefs(fakeStorage({ [PREFS_KEY]: JSON.stringify({ theme: "sepia", haptics: "yes", seenNotes: ["squad", 3] }) })))
      .toEqual({ ...DEFAULT_PREFS, seenNotes: ["squad"] });
  });

  it("round-trips a full set of preferences", () => {
    const storage = fakeStorage();
    const prefs = { layout: "v2", theme: "dark", reduceMotion: "on", haptics: false, clubNames: "edited", seenNotes: ["board"] };
    expect(writePrefs(storage, prefs)).toEqual(prefs);
    expect(readPrefs(storage)).toEqual(prefs);
    expect(sanitizePrefs(undefined)).toEqual(DEFAULT_PREFS);
  });

  it("?layout=v2 saves the flag and ?layout=v1 clears it; anything else is ignored", () => {
    const storage = fakeStorage();
    expect(applyLayoutFlag("?layout=v2&gallery=1", storage).layout).toBe("v2");
    expect(readPrefs(storage).layout).toBe("v2");
    expect(applyLayoutFlag("", storage).layout).toBe("v2");
    expect(applyLayoutFlag("?layout=v3", storage).layout).toBe("v2");
    expect(applyLayoutFlag("?layout=v1", storage).layout).toBe("v1");
    expect(readPrefs(storage).layout).toBe("v1");
    expect(applyLayoutFlag("?layout=v2", null).layout).toBe("v2");
  });
});
