import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { useMemo, useReducer } from "react";
import BoardTab from "./BoardTab.jsx";
import { summarize } from "./dials.jsx";
import { opponentsAverage } from "./Strengths.jsx";
import LiveRegion from "../../ui/LiveRegion.jsx";
import { TermsProvider } from "../../ui/Term.jsx";
import terms from "../../content/terms.json";
import { makeMiniDataset } from "../../../tests/fixtures/miniDataset.js";
import { makeSeason3TacticsState } from "../../../tests/fixtures/saves.js";
import { createReducer } from "../../state/reducer.js";
import { liveAssignments } from "../../state/selectors.js";
import { computeFamiliarity } from "../../engine/familiarity.js";
import { computeTeamProfile } from "../../engine/tactics.js";
import { DEFAULT_INSTRUCTIONS } from "../../engine/instructions.js";
import { clubSeasonLabel } from "../../content/clubs.js";
import { DEFAULT_PREFS } from "../../state/prefs.js";

const dataset = makeMiniDataset();
const reducer = createReducer(dataset);

function Harness({ initial, spy = {} }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const live = useMemo(() => liveAssignments(state.assignments), [state.assignments]);
  const familiarity = computeFamiliarity(live, state.instructions, state.formationKey);
  const profile = computeTeamProfile(live, state.instructions, familiarity);
  spy.state = state;
  return (
    <TermsProvider terms={terms}>
      <LiveRegion>
        <BoardTab state={state} dispatch={dispatch} profile={profile} familiarity={familiarity} clubSeason={(k) => clubSeasonLabel(dataset, k)} prefs={DEFAULT_PREFS} onDismissNote={() => {}} />
      </LiveRegion>
    </TermsProvider>
  );
}

describe("Board helpers", () => {
  it("summarises a group by its end words and says when everything is neutral", () => {
    expect(summarize(DEFAULT_INSTRUCTIONS, ["width", "focus"], ["Rigid"])).toBe("Rigid");
    expect(summarize(DEFAULT_INSTRUCTIONS, ["width", "focus"])).toBe("All at neutral");
    expect(summarize({ ...DEFAULT_INSTRUCTIONS, width: 88, focus: 20 }, ["width", "focus", "counter"])).toBe("Wide · Through the middle");
  });

  it("averages the rivals' effective strength for the reference tick", () => {
    expect(opponentsAverage([{ ov: 80, histMean: 70 }, { ov: 60, histMean: 70 }])).toBeCloseTo(70, 5);
    expect(opponentsAverage([])).toBeNull();
  });
});

describe("BoardTab", () => {
  it("shows the identity line and cohesion first, with the three approach dials visible and the rest collapsed", () => {
    const state = makeSeason3TacticsState();
    render(<Harness initial={state} />);
    expect(screen.getByRole("region", { name: "Identity and cohesion" }).textContent).toContain("Gegenpress");
    expect(screen.getByRole("meter", { name: "Cohesion" }).getAttribute("aria-valuetext")).toMatch(/^(Clicking|Settled|Rough|Strangers), \d+ of 100$/);
    expect(screen.getByRole("radio", { name: "Gegenpress", checked: true })).toBeTruthy();
    expect(screen.getByRole("radio", { name: /Blank slate/ }).textContent).toContain("no identity bonus");
    for (const label of ["Mentality", "Tempo", "Directness"]) expect(screen.getByRole("slider", { name: label })).toBeTruthy();
    expect(screen.queryByRole("slider", { name: "Width" })).toBeNull();
    const group = screen.getByRole("button", { name: /In possession/ });
    expect(group.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(group);
    expect(screen.getByRole("slider", { name: "Width" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Loose", checked: true })).toBeTruthy();
    expect(screen.getAllByRole("meter").length).toBe(7);
    expect(screen.getByRole("meter", { name: "Attack" }).getAttribute("aria-valuetext")).toMatch(/average opponent \d+/);
  });

  it("rewrites the dials when a preset is chosen and slips the ones that moved", () => {
    const spy = {};
    render(<Harness initial={makeSeason3TacticsState()} spy={spy} />);
    expect(screen.getByTestId("dial-directness").className).not.toContain("slip");
    fireEvent.click(screen.getByRole("radio", { name: "Possession Control" }));
    expect(spy.state.selectedStyle).toBe("possession");
    expect(spy.state.instructions.directness).toBe(20);
    expect(screen.getByTestId("dial-directness").className).toContain("slip");
    expect(screen.getByTestId("live-region").textContent).toMatch(/Possession Control set\. \d+ dials moved/);
    fireEvent.click(screen.getByRole("radio", { name: "Possession Control" }));
    expect(screen.getByTestId("live-region").textContent).toBe("Possession Control set. Nothing changed.");
    expect(screen.getByTestId("dial-directness").className).not.toContain("slip");
  });

  it("changes a dial with the stepper, toggles the trap, and opens a player sheet from a marker", () => {
    const spy = {};
    const state = makeSeason3TacticsState();
    render(<Harness initial={state} spy={spy} />);
    fireEvent.click(screen.getByRole("button", { name: "Raise Tempo" }));
    expect(spy.state.instructions.tempo).toBe(state.instructions.tempo + 5);
    fireEvent.click(screen.getByRole("button", { name: /Out of possession/ }));
    fireEvent.click(screen.getByRole("switch", { name: /Offside trap/ }));
    expect(spy.state.instructions.offsideTrap).toBe(!state.instructions.offsideTrap);
    fireEvent.click(screen.getByRole("radio", { name: "Zonal" }));
    expect(spy.state.instructions.marking).toBe("zonal");
    const board = screen.getByRole("group", { name: "Chalkboard" });
    const marker = within(board).getByRole("button", { name: new RegExp(state.assignments[0].player.name) });
    fireEvent.keyDown(marker, { key: "e" });
    expect(screen.getByRole("dialog").textContent).toContain(state.assignments[0].player.name);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset shape" }));
    expect(screen.getByTestId("live-region").textContent).toBe("Shape reset.");
  });
});
