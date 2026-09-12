import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { makeMiniDataset } from "../../../tests/fixtures/miniDataset.js";
import { playCareer } from "../../../tests/fixtures/playCareer.js";
import { createReducer } from "../../state/reducer.js";
import { makeInitialState } from "../../state/initialState.js";
import FormationSelect from "./FormationSelect.jsx";
import RatingsRevealScreen from "./RatingsRevealScreen.jsx";
import ResultCard from "./ResultCard.jsx";
import TransferScreen from "./TransferScreen.jsx";

function seasonOneResult() {
  const dataset = makeMiniDataset();
  const reducer = createReducer(dataset);
  const state = playCareer({ reducer, initialState: makeInitialState(dataset, 11), seasons: 1 });
  return { reducer, state };
}

describe("screens render", () => {
  it("FormationSelect", () => {
    const dataset = makeMiniDataset();
    const state = makeInitialState(dataset, 1);
    render(<FormationSelect formationKey="4-3-3" onPick={vi.fn()} onStart={vi.fn()} assignments={state.assignments} eraMin={1992} eraMax={2024} onSetEra={vi.fn()} />);
    expect(screen.getByText("Choose your formation")).toBeTruthy();
  });

  it("RatingsRevealScreen shows everything at once when instant", () => {
    const { state } = seasonOneResult();
    render(<RatingsRevealScreen assignments={state.assignments} season={1} onKickoff={vi.fn()} instant />);
    expect(screen.getByText("Squad Average")).toBeTruthy();
  });

  it("ResultCard shows the verdict and table when instant", () => {
    const { state } = seasonOneResult();
    render(<ResultCard simulation={state.simulation} formationKey={state.formationKey} assignments={state.assignments} onReset={vi.fn()} onContinue={vi.fn()} instant />);
    expect(screen.getByText(state.simulation.tier.name)).toBeTruthy();
    expect(screen.getByText(/Final Table/)).toBeTruthy();
  });

  it("TransferScreen lists five candidates", () => {
    const { reducer, state } = seasonOneResult();
    const transfer = reducer(state, { type: "GOTO_TRANSFER" });
    render(<TransferScreen shortlist={transfer.shortlist} assignments={transfer.assignments} season={1} lastTransition={transfer.lastTransition} onSignBench={vi.fn()} onSignXI={vi.fn()} onContinue={vi.fn()} />);
    expect(screen.getAllByRole("button", { name: "Sign to Bench" })).toHaveLength(5);
  });
});
