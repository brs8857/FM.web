import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePitchDrag } from "./usePitchDrag.js";

const assignments = [
  { slotId: "GK", pos: { x: 50, y: 92 } },
  { slotId: "ST", pos: { x: 50, y: 12 } },
];

function setupDom() {
  document.body.innerHTML = `
    <div data-drop-zone="pitch" id="pitch"><button data-slot-id="GK" id="gk"></button><button data-slot-id="ST" id="st"></button></div>
    <div data-bench-idx="2" id="bench2"></div>
    <div id="outside"></div>`;
  document.getElementById("pitch").getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 300 });
}

function pointAt(id) {
  document.elementFromPoint = vi.fn(() => document.getElementById(id));
}

function release(x = 100, y = 150) {
  window.dispatchEvent(new PointerEvent("pointerup", { clientX: x, clientY: y }));
}

describe("usePitchDrag", () => {
  beforeEach(setupDom);

  function start(kind, id) {
    const dispatch = vi.fn();
    const hook = renderHook(() => usePitchDrag({ assignments, dispatch }));
    act(() => hook.result.current.startDrag(kind, id));
    return { dispatch, hook };
  }

  it("swaps two slots when a player is dropped on a teammate", () => {
    const { dispatch, hook } = start("slot", "GK");
    pointAt("st");
    act(() => release());
    expect(dispatch).toHaveBeenCalledWith({ type: "SWAP_PLAYERS", fromKind: "slot", fromId: "GK", toKind: "slot", toId: "ST" });
    expect(hook.result.current.dragInfo).toBeNull();
  });

  it("ignores a drop back on the same slot", () => {
    const { dispatch } = start("slot", "GK");
    pointAt("gk");
    act(() => release());
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("swaps with a bench spot", () => {
    const { dispatch } = start("slot", "ST");
    pointAt("bench2");
    act(() => release());
    expect(dispatch).toHaveBeenCalledWith({ type: "SWAP_PLAYERS", fromKind: "slot", fromId: "ST", toKind: "bench", toId: 2 });
  });

  it("moves a slot player to the exact drop point on open pitch", () => {
    const { dispatch } = start("slot", "GK");
    pointAt("pitch");
    act(() => release(100, 150));
    expect(dispatch).toHaveBeenCalledWith({ type: "MOVE_PLAYER", slotId: "GK", x: 50, y: 50 });
  });

  it("judges the drop where the marker is drawn, not where the finger is, keeping the grab offset", () => {
    const dispatch = vi.fn();
    const hook = renderHook(() => usePitchDrag({ assignments, dispatch }));
    // Grabbed 20 px below and 10 px left of the marker's centre.
    act(() => hook.result.current.startDrag("slot", "GK", { dx: -10, dy: 20 }));
    pointAt("pitch");
    act(() => release(100, 170));
    expect(document.elementFromPoint).toHaveBeenCalledWith(110, 150);
    const move = dispatch.mock.calls[0][0];
    expect(move).toMatchObject({ type: "MOVE_PLAYER", slotId: "GK", y: 50 });
    expect(move.x).toBeCloseTo(55, 6);
  });

  it("puts the whole marker, not just its disc, where it was held on a free move", () => {
    const dispatch = vi.fn();
    const hook = renderHook(() => usePitchDrag({ assignments, dispatch }));
    // The disc's centre is 6 px above the finger; the marker's (disc and name) 14 px above it.
    act(() => hook.result.current.startDrag("slot", "GK", { dx: 0, dy: 6, bx: 0, by: 14 }));
    pointAt("pitch");
    act(() => release(100, 164));
    expect(document.elementFromPoint).toHaveBeenCalledWith(100, 158);
    const move = dispatch.mock.calls[0][0];
    expect(move.y).toBeCloseTo(50, 6);
  });

  it("swaps a bench player into the nearest slot when dropped on open pitch", () => {
    const { dispatch } = start("bench", 1);
    pointAt("pitch");
    act(() => release(100, 30)); // (50, 10) → nearest is ST at (50, 12)
    expect(dispatch).toHaveBeenCalledWith({ type: "SWAP_PLAYERS", fromKind: "bench", fromId: 1, toKind: "slot", toId: "ST" });
  });

  it("handles a touch drop exactly once even when touchend and a duplicate pointerup follow (bug #7)", () => {
    const { dispatch, hook } = start("slot", "GK");
    pointAt("st");
    act(() => {
      release();
      const touchEnd = new Event("touchend");
      touchEnd.changedTouches = [{ clientX: 100, clientY: 150 }];
      window.dispatchEvent(touchEnd);
      release();
    });
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(hook.result.current.dragInfo).toBeNull();
  });

  it("cancels the drag without dropping when the browser cancels the pointer", () => {
    const { dispatch, hook } = start("slot", "GK");
    act(() => { window.dispatchEvent(new PointerEvent("pointercancel")); });
    expect(dispatch).not.toHaveBeenCalled();
    expect(hook.result.current.dragInfo).toBeNull();
  });
});
