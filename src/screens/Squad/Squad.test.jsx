import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { useReducer } from "react";
import SquadTab from "./SquadTab.jsx";
import { statBand } from "./StatPip.jsx";
import LiveRegion from "../../ui/LiveRegion.jsx";
import { TermsProvider } from "../../ui/Term.jsx";
import terms from "../../content/terms.json";
import { makeMiniDataset } from "../../../tests/fixtures/miniDataset.js";
import { makeSeason3TacticsState } from "../../../tests/fixtures/saves.js";
import { createReducer } from "../../state/reducer.js";
import { clubSeasonLabel } from "../../content/clubs.js";
import { DEFAULT_PREFS } from "../../state/prefs.js";

const dataset = makeMiniDataset();
const reducer = createReducer(dataset);

function Harness({ initial, revealed = false, spy = {} }) {
  const [state, dispatch] = useReducer(reducer, initial);
  spy.state = state;
  return (
    <TermsProvider terms={terms}>
      <LiveRegion>
        <SquadTab state={state} dispatch={dispatch} clubSeason={(k) => clubSeasonLabel(dataset, k)} revealed={revealed} prefs={DEFAULT_PREFS} onDismissNote={() => {}} />
      </LiveRegion>
    </TermsProvider>
  );
}

describe("StatPip bands", () => {
  it("maps stats to five bands on the dataset quintiles", () => {
    expect(statBand(40)).toEqual({ band: 1, word: "Weak" });
    expect(statBand(62)).toEqual({ band: 2, word: "Modest" });
    expect(statBand(71)).toEqual({ band: 3, word: "Good" });
    expect(statBand(79)).toEqual({ band: 4, word: "Strong" });
    expect(statBand(87)).toEqual({ band: 5, word: "Elite" });
  });
});

describe("SquadTab", () => {
  it("lists the eleven and the bench with jobs, and never prints a rating", () => {
    const state = makeSeason3TacticsState();
    render(<Harness initial={state} />);
    const rows = screen.getByRole("heading", { name: "Team sheet" }).parentElement.querySelectorAll("li");
    expect(rows).toHaveLength(11);
    expect(rows[0].textContent).toContain("Line keeper · Hold");
    expect(screen.getByRole("heading", { name: "Bench" })).toBeTruthy();
    const numbers = document.body.textContent.match(/\b(\d{2})\b/g) ?? [];
    const ratings = [...state.assignments.map((a) => a.player.ov), ...state.bench.map((b) => b.player.ov)];
    expect(numbers.map(Number).filter((n) => ratings.includes(n) && n > 45)).toEqual(numbers.map(Number).filter((n) => ratings.includes(n) && n > 45 && [...state.assignments, ...state.bench].some((e) => e.player.age === n)));
  });

  it("opens the player sheet with five-band pips, changes job and brief, and swaps", () => {
    const spy = {};
    const state = makeSeason3TacticsState();
    render(<Harness initial={state} spy={spy} />);
    const stIdx = state.assignments.findIndex((a) => a.type === "ST");
    const sheet = screen.getByRole("heading", { name: "Team sheet" }).parentElement;
    fireEvent.click(within(sheet).getByRole("button", { name: new RegExp(state.assignments[stIdx].player.name) }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.querySelectorAll('[role="meter"]')).toHaveLength(6);
    expect(screen.getByRole("meter", { name: "Pace" }).getAttribute("aria-valuetext")).toMatch(/, \d of 5$/);
    expect(dialog.textContent).not.toMatch(/Overall/);
    expect(dialog.textContent).toMatch(/(Alpha|Beta United|Gamma Town|Delta City) 20\d\d-\d\d/);
    fireEvent.click(screen.getByRole("radio", { name: "Target man" }));
    expect(spy.state.assignments[stIdx].role).toBe("TM");
    fireEvent.click(screen.getByRole("radio", { name: "Push" }));
    expect(spy.state.assignments[stIdx].duty).toBe("Attack");
    fireEvent.click(screen.getByRole("button", { name: "Raise Attacking freedom" }));
    expect(spy.state.assignments[stIdx].sliderAtt).toBe(55);
    fireEvent.click(screen.getByRole("button", { name: "Swap with…" }));
    fireEvent.click(screen.getByRole("dialog").querySelector("li button"));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(spy.state.assignments.map((a) => a.player.name)).not.toEqual(state.assignments.map((a) => a.player.name));
    expect(screen.getByTestId("live-region").textContent).toMatch(/swapped/);
  });

  it("marks a banned bench player on the bench and in Swap with…", () => {
    const base = makeSeason3TacticsState();
    const banned = base.bench[1].player;
    render(<Harness initial={{ ...base, discipline: { [banned.id]: { yellows: 0, banned: 1 } } }} />);
    const bench = screen.getByRole("heading", { name: "Bench" }).parentElement;
    expect(within(bench).getAllByRole("button", { name: /Suspended for the next match/ }).map((b) => b.textContent))
      .toEqual([expect.stringContaining(banned.name)]);
    const sheet = screen.getByRole("heading", { name: "Team sheet" }).parentElement;
    fireEvent.click(within(sheet).getAllByRole("button")[0]);
    fireEvent.click(screen.getByRole("button", { name: "Swap with…" }));
    const swapList = screen.getByRole("region", { name: "Swap with" });
    expect(within(swapList).getAllByRole("button", { name: /Suspended for the next match/ }).map((b) => b.textContent))
      .toEqual([expect.stringContaining(banned.name)]);
  });

  it("shows the overall only once ratings are revealed, and a bench sheet without a job", () => {
    const state = makeSeason3TacticsState();
    render(<Harness initial={state} revealed />);
    const bench = screen.getByRole("heading", { name: "Bench" }).parentElement;
    fireEvent.click(within(bench).getByRole("button", { name: new RegExp(state.bench[0].player.name) }));
    expect(screen.getByRole("dialog").textContent).toContain("Overall");
    expect(screen.getByRole("dialog").textContent).toContain("On the bench");
    expect(screen.queryByRole("radiogroup")).toBeNull();
  });
});
