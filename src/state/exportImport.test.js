import { describe, it, expect, vi, afterEach } from "vitest";
import { makeSaveText, makeSeason3TacticsState } from "../../tests/fixtures/saves.js";
import { saveFileName, exportSaveText, readImportFile } from "./exportImport.js";
import { SAVE_ERRORS } from "./save.js";

afterEach(() => vi.restoreAllMocks());

const coarse = (matches) => ({ matchMedia: () => ({ matches }) });

describe("export and import", () => {
  it("names the file after the season", () => {
    expect(saveFileName(makeSeason3TacticsState())).toBe("fmweb-season3-2028-29.json");
  });

  it("uses the share sheet on touch devices that can share files", async () => {
    const nav = { canShare: vi.fn(() => true), share: vi.fn(() => Promise.resolve()) };
    await expect(exportSaveText("{}", "a.json", { nav, win: coarse(true) })).resolves.toBe("shared");
    expect(nav.share.mock.calls[0][0].files[0].name).toBe("a.json");
  });

  it("treats a dismissed share sheet as cancelled", async () => {
    const nav = { canShare: () => true, share: () => Promise.reject(new DOMException("no", "AbortError")) };
    await expect(exportSaveText("{}", "a.json", { nav, win: coarse(true) })).resolves.toBe("cancelled");
  });

  it("downloads on desktop", async () => {
    URL.createObjectURL = vi.fn(() => "blob:fmweb");
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const nav = { canShare: () => true, share: vi.fn() };
    await expect(exportSaveText("{}", "b.json", { nav, win: coarse(false) })).resolves.toBe("downloaded");
    expect(nav.share).not.toHaveBeenCalled();
    expect(click).toHaveBeenCalledOnce();
  });

  it("reads and validates an imported file", async () => {
    const good = await readImportFile(new File([makeSaveText()], "save.json", { type: "application/json" }));
    expect(good.ok).toBe(true);
    const bad = await readImportFile(new File(["hello"], "notes.txt"));
    expect(bad).toEqual({ ok: false, reason: SAVE_ERRORS.notFmWeb });
  });
});
