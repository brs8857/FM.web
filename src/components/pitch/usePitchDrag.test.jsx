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

  it("swaps a bench player into the nearest slot when dropped on open pitch", () => {
    const { dispatch } = start("bench", 1);
    pointAt("pitch");
    act(() => release(100, 30)); // (50, 10) → nearest is ST at (50, 12)
    expect(dispatch).toHaveBeenCalledWith({ type: "SWAP_PLAYERS", fromKind: "bench", fromId: 1, toKind: "slot", toId: "ST" });
  });
});
