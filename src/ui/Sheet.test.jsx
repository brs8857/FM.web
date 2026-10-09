import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { beforeEach, afterEach } from "vitest";
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

// A sheet leaves by sliding out, so it stays in the page, inert, for EXIT_MS.
const EXIT_MS = 200;
let clock = 0;
const advance = (ms) => act(() => { vi.advanceTimersByTime(ms); });
const panelHeight = 500;

beforeEach(() => {
  vi.useFakeTimers();
  clock = 0;
  vi.spyOn(performance, "now").mockImplementation(() => clock);
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(() => ({ height: panelHeight, width: 400, top: 0, left: 0, right: 400, bottom: panelHeight }));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// A drag on the handle: [clientY, ms since the press] for each move, then let go.
function drag(grip, moves) {
  fireEvent.pointerDown(grip, { clientY: 100, pointerId: 1 });
  for (const [y, t] of moves) { clock = t; fireEvent.pointerMove(grip, { clientY: 100 + y, pointerId: 1 }); }
  fireEvent.pointerUp(grip, { clientY: 100 + moves.at(-1)[0], pointerId: 1 });
}

describe("Sheet", () => {
  it("is a labelled modal dialog that takes focus, returns it on close, and slides out before it goes", () => {
    render(<Host />);
    expect(screen.queryByRole("dialog")).toBeNull();
    const opener = openSheet();
    const dialog = screen.getByRole("dialog", { name: "Cohesion" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(document.activeElement).toBe(dialog);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(document.activeElement).toBe(opener);
    expect(dialog.hasAttribute("inert")).toBe(true);
    expect(dialog.className).toMatch(/leaving/);
    advance(EXIT_MS - 1);
    expect(screen.queryByRole("dialog")).not.toBeNull();
    advance(1);
    expect(screen.queryByRole("dialog")).toBeNull();
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

  it("follows the finger one for one, picking up from where the sheet is", () => {
    render(<Host />);
    openSheet();
    const panel = screen.getByRole("dialog");
    const grip = panel.firstChild;
    fireEvent.pointerDown(grip, { clientY: 100, pointerId: 1 });
    clock = 50;
    fireEvent.pointerMove(grip, { clientY: 160, pointerId: 1 });
    expect(panel.style.transform).toBe("translateY(60px)");
    expect(panel.style.transition).toBe("none");
    expect(screen.getByTestId("sheet-backdrop").style.opacity).toBe(String(1 - (60 / panelHeight) * 0.8));
  });

  it("resists being pulled up past its resting place instead of following", () => {
    render(<Host />);
    openSheet();
    const panel = screen.getByRole("dialog");
    drag(panel.firstChild, [[-100, 100]]);
    const y = Number(/translateY\(([-\d.]+)px\)/.exec(panel.style.transform)?.[1] ?? "0");
    expect(y).toBe(0);
    const grip = panel.firstChild;
    fireEvent.pointerDown(grip, { clientY: 100, pointerId: 1 });
    clock = 600;
    fireEvent.pointerMove(grip, { clientY: 0, pointerId: 1 });
    const pulled = Number(/translateY\(([-\d.]+)px\)/.exec(panel.style.transform)[1]);
    expect(pulled).toBeLessThan(0);
    expect(pulled).toBeGreaterThan(-100);
  });

  it("springs back, with a little bounce, from a short slow drag", () => {
    const onClose = vi.fn();
    render(<Host onClose={onClose} />);
    openSheet();
    const panel = screen.getByRole("dialog");
    drag(panel.firstChild, [[20, 300], [50, 700]]);
    expect(panel.style.transition).toContain("--spring-flick");
    expect(panel.style.transform).toBe("translateY(0)");
    advance(1000);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("goes by where a flick is heading: a short, fast pull down dismisses it", () => {
    const onClose = vi.fn();
    render(<Host onClose={onClose} />);
    openSheet();
    const panel = screen.getByRole("dialog");
    drag(panel.firstChild, [[20, 20], [50, 40]]);
    expect(panel.style.transform).toBe(`translateY(${panelHeight}px)`);
    expect(screen.getByTestId("sheet-backdrop").style.opacity).toBe("0");
    expect(onClose).not.toHaveBeenCalled();
    advance(400);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("treats a fast pull followed by a held finger as no flick at all", () => {
    const onClose = vi.fn();
    render(<Host onClose={onClose} />);
    openSheet();
    const panel = screen.getByRole("dialog");
    const grip = panel.firstChild;
    fireEvent.pointerDown(grip, { clientY: 100, pointerId: 1 });
    clock = 60;
    fireEvent.pointerMove(grip, { clientY: 160, pointerId: 1 });
    clock = 700; // the finger rests; no more moves arrive
    fireEvent.pointerUp(grip, { clientY: 160, pointerId: 1 });
    expect(panel.style.transform).toBe("translateY(0)");
    advance(1000);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("dismisses a slow drag past the threshold, and not one that ends on the way back up", () => {
    const onClose = vi.fn();
    render(<Host onClose={onClose} />);
    openSheet();
    drag(screen.getByRole("dialog").firstChild, [[60, 400], [150, 900]]);
    advance(400);
    expect(onClose).toHaveBeenCalledTimes(1);
    openSheet();
    const panel = screen.getByRole("dialog");
    drag(panel.firstChild, [[100, 300], [160, 340], [130, 380], [60, 420]]);
    expect(panel.style.transform).toBe("translateY(0)");
    advance(1000);
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
    const inner = screen.getByRole("dialog", { name: "Brief" });
    fireEvent.keyDown(inner, { key: "Escape" });
    expect(inner.hasAttribute("inert")).toBe(true);
    expect(screen.getByRole("dialog", { name: "Cohesion" }).hasAttribute("inert")).toBe(false);
    advance(EXIT_MS);
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByRole("dialog", { name: "Cohesion" })).toBeTruthy();
    expect(document.activeElement).toBe(deeper);
  });
});
