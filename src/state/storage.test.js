import { describe, it, expect, vi } from "vitest";
import { fakeStorage, makeSaveText } from "../../tests/fixtures/saves.js";
import { SAVE_KEY, CORRUPT_KEY, getStorage, readAutosave, writeAutosave, clearAutosave, requestPersistentStorage } from "./storage.js";

describe("storage", () => {
  it("returns null when localStorage is blocked, and the real storage when it works", () => {
    expect(getStorage({ get localStorage() { throw new Error("SecurityError"); } })).toBeNull();
    expect(getStorage(window)).toBe(window.localStorage);
  });

  it("reads none, a valid save, or moves a corrupt one aside", () => {
    expect(readAutosave(fakeStorage())).toEqual({ status: "none" });

    const ok = readAutosave(fakeStorage({ [SAVE_KEY]: makeSaveText() }));
    expect(ok.status).toBe("ok");
    expect(ok.save.state.season).toBe(3);

    const broken = fakeStorage({ [SAVE_KEY]: "{garbage" });
    expect(readAutosave(broken)).toEqual({ status: "corrupt" });
    expect(broken.data.get(CORRUPT_KEY)).toBe("{garbage");
    expect(broken.data.has(SAVE_KEY)).toBe(false);
  });

  it("reports a failed write instead of throwing, and clears the save", () => {
    const full = fakeStorage();
    full.setItem.mockImplementation(() => { throw new DOMException("full", "QuotaExceededError"); });
    expect(writeAutosave(full, "x")).toBe(false);

    const storage = fakeStorage();
    expect(writeAutosave(storage, "x")).toBe(true);
    clearAutosave(storage);
    expect(storage.data.has(SAVE_KEY)).toBe(false);
  });

  it("asks for persistent storage when the browser supports it", () => {
    const persist = vi.fn(() => Promise.resolve(true));
    requestPersistentStorage({ storage: { persist } });
    expect(persist).toHaveBeenCalledOnce();
    expect(() => requestPersistentStorage({})).not.toThrow();
  });
});
