import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { fakeStorage } from "../../../tests/fixtures/saves.js";
import { useAutosave } from "./useAutosave.js";
import { SAVE_KEY } from "../../state/storage.js";

const state = (phase, extra = {}) => ({ phase, draftedIds: new Set(), season: 1, ...extra });

function setup(initial, options = {}) {
  const storage = options.storage ?? fakeStorage();
  const onWriteError = vi.fn();
  const hook = renderHook((props) => useAutosave(props), {
    initialProps: { state: initial, storage, enabled: options.enabled ?? true, onWriteError },
  });
  return { storage, onWriteError, rerender: (s, enabled = options.enabled ?? true) => hook.rerender({ state: s, storage, enabled, onWriteError }) };
}

describe("useAutosave", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("never saves on the formation screen", () => {
    const { storage } = setup(state("formation"));
    act(() => vi.advanceTimersByTime(2000));
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("debounces ordinary changes by 500 ms", () => {
    const { storage } = setup(state("draft"));
    act(() => vi.advanceTimersByTime(499));
    expect(storage.setItem).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(storage.setItem).toHaveBeenCalledOnce();
    expect(JSON.parse(storage.data.get(SAVE_KEY)).state.phase).toBe("draft");
  });

  it("saves immediately when the phase changes, and skips identical state", () => {
    const { storage, rerender } = setup(state("draft"));
    act(() => vi.advanceTimersByTime(500));
    rerender(state("tactics"));
    expect(storage.setItem).toHaveBeenCalledTimes(2);
    rerender(state("tactics"));
    act(() => vi.advanceTimersByTime(500));
    expect(storage.setItem).toHaveBeenCalledTimes(2);
  });

  it("does nothing while disabled", () => {
    const { storage } = setup(state("tactics"), { enabled: false });
    act(() => vi.advanceTimersByTime(1000));
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("reports write failures", () => {
    const storage = fakeStorage();
    storage.setItem.mockImplementation(() => { throw new Error("full"); });
    const { onWriteError } = setup(state("draft"), { storage });
    act(() => vi.advanceTimersByTime(500));
    expect(onWriteError).toHaveBeenCalled();
  });

  it("flushes on pagehide", () => {
    const { storage } = setup(state("draft"));
    act(() => { window.dispatchEvent(new Event("pagehide")); });
    expect(storage.setItem).toHaveBeenCalledOnce();
  });
});
