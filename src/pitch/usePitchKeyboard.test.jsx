import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePitchKeyboard } from "./usePitchKeyboard.js";

const assignments = [
  { slotId: "GK", type: "GK", player: { name: "David Seaman" }, pos: { x: 50, y: 92 } },
  { slotId: "CB1", type: "CB", player: { name: "Tony Adams" }, pos: { x: 36, y: 79 } },
  { slotId: "ST", type: "ST", player: null, pos: { x: 50, y: 12 } },
];
const bench = [{ player: { name: "Ian Wright" } }, { player: null }];

function setup() {
  const dispatch = vi.fn();
  const announce = vi.fn();
  const onOpenSheet = vi.fn();
  const hook = renderHook(() => usePitchKeyboard({ assignments, bench, dispatch, announce, onOpenSheet }));
  const press = (key, kind, id, extra = {}) => {
    const event = { key, preventDefault: vi.fn(), ...extra };
    act(() => hook.result.current.onKeyDown(event, kind, id));
    return event;
  };
  return { dispatch, announce, onOpenSheet, hook, press };
}

describe("usePitchKeyboard", () => {
  it("Enter selects a filled marker and announces how to continue", () => {
    const { hook, press, announce } = setup();
    const event = press("Enter", "slot", "CB1");
    expect(event.preventDefault).toHaveBeenCalled();
    expect(hook.result.current.selected).toEqual({ kind: "slot", id: "CB1" });
    expect(announce).toHaveBeenCalledWith(expect.stringContaining("Tony Adams selected"));
  });

  it("ignores Enter on an empty slot", () => {
    const { hook, press } = setup();
    press("Enter", "slot", "ST");
    expect(hook.result.current.selected).toBeNull();
  });

  it("arrows nudge the selected marker by 2, or 6 with Shift, through MOVE_PLAYER", () => {
    const { press, dispatch } = setup();
    press("ArrowUp", "slot", "CB1");
    expect(dispatch).not.toHaveBeenCalled();
    press("Enter", "slot", "CB1");
    press("ArrowUp", "slot", "CB1");
    expect(dispatch).toHaveBeenLastCalledWith({ type: "MOVE_PLAYER", slotId: "CB1", x: 36, y: 77 });
    press("ArrowRight", "slot", "CB1", { shiftKey: true });
    expect(dispatch).toHaveBeenLastCalledWith({ type: "MOVE_PLAYER", slotId: "CB1", x: 42, y: 79 });
    press("ArrowLeft", "slot", "GK");
    expect(dispatch).toHaveBeenCalledTimes(2);
  });

  it("Enter on another marker swaps and clears the selection", () => {
    const { hook, press, dispatch, announce } = setup();
    press("Enter", "slot", "CB1");
    press("Enter", "bench", 0);
    expect(dispatch).toHaveBeenCalledWith({ type: "SWAP_PLAYERS", fromKind: "slot", fromId: "CB1", toKind: "bench", toId: 0 });
    expect(hook.result.current.selected).toBeNull();
    expect(announce).toHaveBeenLastCalledWith("Tony Adams and Ian Wright swapped.");
  });

  it("Enter on the same marker deselects; Escape cancels", () => {
    const { hook, press, dispatch } = setup();
    press("Enter", "slot", "GK");
    press("Enter", "slot", "GK");
    expect(hook.result.current.selected).toBeNull();
    press("Enter", "slot", "GK");
    const escape = press("Escape", "slot", "CB1");
    expect(escape.preventDefault).toHaveBeenCalled();
    expect(hook.result.current.selected).toBeNull();
    expect(dispatch).not.toHaveBeenCalled();
    expect(press("Escape", "slot", "CB1").preventDefault).not.toHaveBeenCalled();
  });

  it("E opens the sheet for a filled marker", () => {
    const { press, onOpenSheet } = setup();
    press("E", "slot", "GK");
    expect(onOpenSheet).toHaveBeenCalledWith("slot", "GK");
    press("e", "bench", 0);
    expect(onOpenSheet).toHaveBeenCalledWith("bench", 0);
    press("e", "slot", "ST");
    expect(onOpenSheet).toHaveBeenCalledTimes(2);
  });
});
