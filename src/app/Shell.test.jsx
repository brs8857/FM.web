import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Shell, { RAIL_QUERY } from "./Shell.jsx";

const realMatchMedia = window.matchMedia;

function stubWidth(width) {
  window.matchMedia = vi.fn((query) => ({
    matches: query === RAIL_QUERY ? width >= 1024 : false,
    media: query, onchange: null,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; },
  }));
}

afterEach(() => { window.matchMedia = realMatchMedia; });

describe("Shell", () => {
  it("shows a bottom tab bar in Club mode below 600 px, and names the panel from its tab", () => {
    stubWidth(375);
    const onTab = vi.fn();
    render(<Shell mode="club" tab="board" onTab={onTab} title="Board" sticky={<button type="button">Kick off</button>}><p>Dials</p></Shell>);
    const list = screen.getByRole("tablist");
    expect(list.getAttribute("aria-orientation")).toBe("horizontal");
    const panel = screen.getByRole("tabpanel", { name: "Board" });
    expect(panel.id).toBe("panel-board");
    expect(panel.textContent).toContain("Dials");
    expect(list.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Season" }));
    expect(onTab).toHaveBeenCalledWith("season");
    expect(screen.getByRole("button", { name: "Kick off" })).toBeTruthy();
  });

  it("shows a left rail at 1024 px", () => {
    stubWidth(1024);
    render(<Shell mode="club" tab="season" onTab={() => {}} title="Season"><p>Vidiprinter</p></Shell>);
    const list = screen.getByRole("tablist");
    expect(list.getAttribute("aria-orientation")).toBe("vertical");
    expect(list.compareDocumentPosition(screen.getByRole("tabpanel")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("has no tab bar in set-up or draft mode, but keeps the back button", () => {
    stubWidth(375);
    const onBack = vi.fn();
    render(<Shell mode="setup" title="New career" onBack={onBack}><p>Era</p></Shell>);
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByRole("tabpanel")).toBeNull();
    expect(screen.getByRole("main").textContent).toContain("Era");
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
