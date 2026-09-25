import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { navReducer, initialNav, modeFor, useNav, TABS } from "./nav.js";

describe("nav", () => {
  it("derives the mode from the phase and boots on Home", () => {
    expect(modeFor("formation")).toBe("setup");
    expect(modeFor("draft")).toBe("draft");
    for (const phase of ["tactics", "reveal", "result", "transfer"]) expect(modeFor(phase)).toBe("club");
    expect(TABS.map((t) => t.key)).toEqual(["squad", "board", "season", "club"]);
    expect(initialNav("tactics")).toEqual({ mode: "club", tab: "season", sheet: null, history: [], home: true, step: "era" });
  });

  it("switches tabs, remembers where it came from, and closes any sheet", () => {
    let nav = navReducer(initialNav("tactics"), { type: "LEAVE_HOME" });
    nav = navReducer(nav, { type: "OPEN_SHEET", sheet: { kind: "player", id: "CB1" } });
    nav = navReducer(nav, { type: "TAB", tab: "board" });
    expect(nav).toMatchObject({ tab: "board", sheet: null, history: ["season"] });
    expect(navReducer(nav, { type: "TAB", tab: "board" })).toBe(nav);
    expect(navReducer(nav, { type: "TAB", tab: "nope" })).toBe(nav);
  });

  it("BACK closes a sheet first, then returns to the previous tab", () => {
    let nav = navReducer(initialNav("result"), { type: "TAB", tab: "club" });
    nav = navReducer(nav, { type: "OPEN_SHEET", sheet: { kind: "term", id: "cohesion" } });
    nav = navReducer(nav, { type: "BACK" });
    expect(nav.sheet).toBeNull();
    expect(nav.tab).toBe("club");
    nav = navReducer(nav, { type: "BACK" });
    expect(nav).toMatchObject({ tab: "season", history: [] });
    expect(navReducer(nav, { type: "BACK" })).toBe(nav);
  });

  it("walks the set-up steps and BACK retraces them to Home", () => {
    let nav = navReducer(initialNav("formation"), { type: "LEAVE_HOME" });
    expect(nav).toMatchObject({ mode: "setup", home: false, step: "era" });
    nav = navReducer(nav, { type: "STEP", step: "formation" });
    expect(navReducer(nav, { type: "STEP", step: "nope" })).toBe(nav);
    nav = navReducer(nav, { type: "BACK" });
    expect(nav.step).toBe("era");
    nav = navReducer(nav, { type: "BACK" });
    expect(nav.home).toBe(true);
    expect(navReducer(nav, { type: "HOME" })).toBe(nav);
  });

  it("a phase change into Club leaves Home and resets to the given tab; staying in Club keeps the tab", () => {
    let nav = navReducer(initialNav("draft"), { type: "HOME" });
    nav = navReducer(nav, { type: "PHASE", phase: "tactics", tab: "board" });
    expect(nav).toMatchObject({ mode: "club", tab: "board", home: false });
    nav = navReducer(nav, { type: "TAB", tab: "squad" });
    expect(navReducer(nav, { type: "PHASE", phase: "reveal", tab: "season" })).toBe(nav);
  });

  it("useNav follows the phase prop", () => {
    const { result, rerender } = renderHook(({ phase }) => useNav(phase, "season"), { initialProps: { phase: "formation" } });
    expect(result.current[0].mode).toBe("setup");
    rerender({ phase: "tactics" });
    expect(result.current[0]).toMatchObject({ mode: "club", tab: "season", home: false });
    act(() => result.current[1]({ type: "TAB", tab: "board" }));
    expect(result.current[0].tab).toBe("board");
  });
});
