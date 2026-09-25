import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import Chalkboard from "./Chalkboard.jsx";
import { makeInitialAssignments } from "../engine/formations.js";

const player = (name, slot) => ({ id: `${name}-${slot}`, name, slot, side: null, nat: "England", age: 30, ov: 80, stats: {}, seasonKey: "1997_1" });

function fixture() {
  const assignments = makeInitialAssignments("4-3-3");
  assignments[0].player = player("David Seaman", "GK");
  assignments[2].player = player("Tony Adams", "CB");
  const bench = [{ player: player("Ian Wright", "ST"), role: null, duty: null }, { player: null, role: null, duty: null }];
  return { assignments, bench };
}

function pointAt(element) {
  document.elementFromPoint = vi.fn(() => element);
}

beforeEach(() => {
  Element.prototype.setPointerCapture ||= function setPointerCapture() {};
  Element.prototype.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 300, right: 200, bottom: 300 });
});

describe("Chalkboard", () => {
  it("labels every marker for screen readers and keeps the draft board static", () => {
    const { assignments } = fixture();
    render(<Chalkboard assignments={assignments} mode="draft" activeSlotId="LB" />);
    expect(screen.getByRole("group", { name: "Chalkboard" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Goalkeeper, David Seaman." })).toBeTruthy();
    expect(screen.getAllByRole("img", { name: "Full-back, empty." })).toHaveLength(2);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("treats a press that travels under 8 px as a tap, and beyond it as a drag", () => {
    const { assignments, bench } = fixture();
    const onSelect = vi.fn();
    const dispatch = vi.fn();
    render(<Chalkboard assignments={assignments} bench={bench} mode="board" onSelect={onSelect} dispatch={dispatch} />);
    const adams = screen.getByRole("button", { name: /Tony Adams/ });
    const seaman = screen.getByRole("button", { name: /David Seaman/ });

    fireEvent.pointerDown(adams, { clientX: 100, clientY: 100, pointerId: 1, button: 0 });
    fireEvent.pointerMove(adams, { clientX: 104, clientY: 103, pointerId: 1 });
    fireEvent.pointerUp(adams, { clientX: 104, clientY: 103, pointerId: 1 });
    expect(onSelect).toHaveBeenCalledWith("slot", "CB1");
    expect(dispatch).not.toHaveBeenCalled();

    fireEvent.pointerDown(adams, { clientX: 100, clientY: 100, pointerId: 1, button: 0 });
    fireEvent.pointerMove(adams, { clientX: 110, clientY: 100, pointerId: 1 });
    pointAt(seaman);
    act(() => { window.dispatchEvent(new PointerEvent("pointerup", { clientX: 110, clientY: 100 })); });
    expect(dispatch).toHaveBeenCalledWith({ type: "SWAP_PLAYERS", fromKind: "slot", fromId: "CB1", toKind: "slot", toId: "GK" });
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("dispatches a drop exactly once even when pointerup is duplicated", () => {
    const { assignments, bench } = fixture();
    const dispatch = vi.fn();
    render(<Chalkboard assignments={assignments} bench={bench} mode="board" dispatch={dispatch} />);
    const wright = screen.getByRole("button", { name: /Ian Wright/ });
    fireEvent.pointerDown(wright, { clientX: 10, clientY: 10, pointerId: 1, button: 0 });
    fireEvent.pointerMove(wright, { clientX: 40, clientY: 40, pointerId: 1 });
    pointAt(screen.getByRole("button", { name: /Tony Adams/ }));
    act(() => {
      window.dispatchEvent(new PointerEvent("pointerup", { clientX: 40, clientY: 40 }));
      window.dispatchEvent(new PointerEvent("pointerup", { clientX: 40, clientY: 40 }));
    });
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({ type: "SWAP_PLAYERS", fromKind: "bench", fromId: 0, toKind: "slot", toId: "CB1" });
  });

  it("never starts a drag in view mode but still opens on tap", () => {
    const { assignments } = fixture();
    const onSelect = vi.fn();
    const dispatch = vi.fn();
    render(<Chalkboard assignments={assignments} mode="view" onSelect={onSelect} dispatch={dispatch} />);
    const adams = screen.getByRole("button", { name: /Tony Adams/ });
    fireEvent.pointerDown(adams, { clientX: 100, clientY: 100, pointerId: 1, button: 0 });
    fireEvent.pointerMove(adams, { clientX: 150, clientY: 150, pointerId: 1 });
    fireEvent.pointerUp(adams, { clientX: 150, clientY: 150, pointerId: 1 });
    expect(onSelect).toHaveBeenCalledWith("slot", "CB1");
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("supports the keyboard model: select, nudge, swap, cancel, E opens the sheet", () => {
    const { assignments, bench } = fixture();
    const dispatch = vi.fn();
    const onOpenSheet = vi.fn();
    const announce = vi.fn();
    render(<Chalkboard assignments={assignments} bench={bench} mode="board" dispatch={dispatch} onOpenSheet={onOpenSheet} announce={announce} />);
    const adams = screen.getByRole("button", { name: /Tony Adams/ });
    adams.focus();
    fireEvent.keyDown(adams, { key: "Enter" });
    expect(screen.getByRole("button", { name: /Tony Adams. Selected/ }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.keyDown(adams, { key: "ArrowUp" });
    expect(dispatch).toHaveBeenLastCalledWith({ type: "MOVE_PLAYER", slotId: "CB1", x: 36, y: 77 });
    fireEvent.keyDown(adams, { key: "ArrowLeft", shiftKey: true });
    expect(dispatch).toHaveBeenLastCalledWith({ type: "MOVE_PLAYER", slotId: "CB1", x: 30, y: 79 });
    fireEvent.keyDown(adams, { key: "Escape" });
    expect(adams.hasAttribute("aria-pressed")).toBe(false);
    fireEvent.keyDown(adams, { key: "Enter" });
    fireEvent.keyDown(screen.getByRole("button", { name: /Ian Wright/ }), { key: "Enter" });
    expect(dispatch).toHaveBeenLastCalledWith({ type: "SWAP_PLAYERS", fromKind: "slot", fromId: "CB1", toKind: "bench", toId: 0 });
    expect(announce).toHaveBeenLastCalledWith("Tony Adams and Ian Wright swapped.");
    fireEvent.keyDown(adams, { key: "e" });
    expect(onOpenSheet).toHaveBeenCalledWith("slot", "CB1");
  });

  it("highlights the eligible slots for the window's Replace flow", () => {
    const { assignments } = fixture();
    render(<Chalkboard assignments={assignments} mode="view" highlightSlots={["CB1", "CB2"]} />);
    const cb1 = screen.getByRole("button", { name: /Tony Adams/ });
    const cb2 = screen.getByRole("button", { name: "Centre-back, CB2." });
    expect(cb1.className).toContain("highlighted");
    expect(cb2.className).toContain("highlighted");
    expect(screen.getByRole("button", { name: /David Seaman/ }).className).not.toContain("highlighted");
  });
});
