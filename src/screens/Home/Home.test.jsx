import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Home from "./Home.jsx";
import { makeMiniDataset } from "../../../tests/fixtures/miniDataset.js";
import { makeSeason3TacticsState } from "../../../tests/fixtures/saves.js";
import { makeInitialState } from "../../state/initialState.js";
import { selectNextAction } from "../../state/selectors.js";
import { DEFAULT_PREFS } from "../../state/prefs.js";

function renderHome(state, props = {}) {
  const handlers = { onDismissNote: vi.fn(), onContinue: vi.fn(), onNewCareer: vi.fn(), onClub: vi.fn(), onSettings: vi.fn(), onAbout: vi.fn(), ...props };
  render(<Home state={state} next={selectNextAction(state)} identity="Gegenpress" cohesion="Settled" prefs={DEFAULT_PREFS} {...handlers} />);
  return handlers;
}

describe("Home", () => {
  it("shows the resume card with the next action, identity and cohesion for a career in progress", () => {
    const { onContinue, onClub } = renderHome(makeSeason3TacticsState());
    expect(screen.getByRole("heading", { level: 1, name: "Era XI" })).toBeTruthy();
    expect(screen.getByText("Season 3 · 2028-29")).toBeTruthy();
    expect(screen.getByText("Gegenpress")).toBeTruthy();
    expect(screen.getByText("Cohesion: Settled")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Kick off season 3" }));
    expect(onContinue).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Club" }));
    expect(onClub).toHaveBeenCalledOnce();
  });

  it("says where a paused draft is and offers to continue it", () => {
    const state = { ...makeInitialState(makeMiniDataset(), 1), phase: "draft" };
    state.assignments = state.assignments.map((a, i) => (i < 4 ? { ...a, player: { id: "p", name: "Tony Adams" } } : a));
    const { onContinue } = renderHome(state);
    expect(screen.getByRole("heading", { name: "Pick 5 of 11" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Continue the draft" }));
    expect(onContinue).toHaveBeenCalledOnce();
    expect(screen.queryByText(/Cohesion/)).toBeNull();
  });

  it("offers only a new career, settings and about with no career, and shows the coach's note once", () => {
    const { onNewCareer, onSettings, onAbout, onDismissNote } = renderHome(makeInitialState(makeMiniDataset(), 1), { notice: "unavailable" });
    expect(screen.queryByRole("button", { name: "Club" })).toBeNull();
    expect(screen.getByRole("status").textContent).toMatch(/Saving isn't available/);
    fireEvent.click(screen.getByRole("button", { name: "New career" }));
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByRole("button", { name: "About" }));
    expect(onNewCareer).toHaveBeenCalledOnce();
    expect(onSettings).toHaveBeenCalledOnce();
    expect(onAbout).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss note" }));
    expect(onDismissNote).toHaveBeenCalledWith("home");
  });
});
