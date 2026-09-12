import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { makeSeason3TacticsState } from "../../../tests/fixtures/saves.js";
import { liveAssignments, selectFamiliarity, selectProfile } from "../../state/selectors.js";
import TacticsScreen from "./TacticsScreen.jsx";

describe("TacticsScreen", () => {
  it("renders the board and dispatches Simulate", () => {
    const state = makeSeason3TacticsState();
    const live = liveAssignments(state.assignments);
    const familiarity = selectFamiliarity(live, state.instructions, state.formationKey);
    const profile = selectProfile(live, state.instructions, familiarity);
    const dispatch = vi.fn();
    render(<TacticsScreen state={state} dispatch={dispatch} activeSlotId={null} onSelectSlot={vi.fn()}
      dragInfo={null} onDragStart={vi.fn()} profile={profile} familiarity={familiarity} />);
    expect(screen.getByText("1. Style of Play")).toBeTruthy();
    expect(screen.getByText("2. Team Instructions")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Reveal Ratings & Simulate/ }));
    expect(dispatch).toHaveBeenCalledWith({ type: "SIMULATE" });
  });
});
