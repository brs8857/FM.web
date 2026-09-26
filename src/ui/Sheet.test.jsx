import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import Sheet from "./Sheet.jsx";

function Host({ onClose = () => {}, children }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open</button>
      <Sheet open={open} onClose={() => { setOpen(false); onClose(); }} title="Cohesion">
        {children ?? <><button type="button">First</button><button type="button">Last</button></>}
      </Sheet>
    </>
  );
}

function openSheet() {
  const opener = screen.getByRole("button", { name: "Open" });
  opener.focus();
  fireEvent.click(opener);
  return opener;
}

describe("Sheet", () => {
  it("is a labelled modal dialog that takes focus and returns it on close", () => {
    render(<Host />);
    expect(screen.queryByRole("dialog")).toBeNull();
    const opener = openSheet();
    const dialog = screen.getByRole("dialog", { name: "Cohesion" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(document.activeElement).toBe(dialog);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("closes on Escape and on a backdrop tap, but not on a tap inside", () => {
    const onClose = vi.fn();
    render(<Host onClose={onClose} />);
    openSheet();
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole("button", { name: "First" }), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    openSheet();
    fireEvent.click(screen.getByTestId("sheet-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("traps Tab inside the dialog in both directions", () => {
    render(<Host />);
    openSheet();
    const first = screen.getByRole("button", { name: "Close" });
    const last = screen.getByRole("button", { name: "Last" });
    last.focus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("closes after a downward swipe of more than 80 px on the handle", () => {
    const onClose = vi.fn();
    render(<Host onClose={onClose} />);
    openSheet();
    const grip = screen.getByRole("dialog").firstChild;
    fireEvent.pointerDown(grip, { clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(grip, { clientY: 150, pointerId: 1 });
    fireEvent.pointerUp(grip, { clientY: 150, pointerId: 1 });
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.pointerDown(grip, { clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(grip, { clientY: 200, pointerId: 1 });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("nests: Escape in an inner sheet closes only the inner one", () => {
    function Nested() {
      const [inner, setInner] = useState(false);
      return (
        <Host>
          <button type="button" onClick={() => setInner(true)}>Deeper</button>
          <Sheet open={inner} onClose={() => setInner(false)} title="Brief"><p>Inner text</p></Sheet>
        </Host>
      );
    }
    render(<Nested />);
    openSheet();
    const deeper = screen.getByRole("button", { name: "Deeper" });
    deeper.focus();
    act(() => { fireEvent.click(deeper); });
    expect(screen.getAllByRole("dialog")).toHaveLength(2);
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Brief" }), { key: "Escape" });
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByRole("dialog", { name: "Cohesion" })).toBeTruthy();
    expect(document.activeElement).toBe(deeper);
  });
});
