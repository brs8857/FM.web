import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { useReducer } from "react";
import Draft from "./Draft.jsx";
import { shirtOrder } from "./CuttingSheet.jsx";
import LiveRegion from "../../ui/LiveRegion.jsx";
import { TermsProvider } from "../../ui/Term.jsx";
import terms from "../../content/terms.json";
import { makeMiniDataset } from "../../../tests/fixtures/miniDataset.js";
import { createReducer } from "../../state/reducer.js";
import { makeInitialState } from "../../state/initialState.js";
import { DEFAULT_PREFS } from "../../state/prefs.js";
import { clubSeasonLabel } from "../../content/clubs.js";

const dataset = makeMiniDataset();
const reducer = createReducer(dataset);

function Harness({ initial, instant = true, spy }) {
  const [state, dispatch] = useReducer(reducer, initial);
  spy.state = state;
  return (
    <TermsProvider terms={terms}>
      <LiveRegion>
        <Draft state={state} dataset={dataset} dispatch={dispatch} instant={instant} clubSeason={(k) => clubSeasonLabel(dataset, k)} prefs={DEFAULT_PREFS} onDismissNote={() => {}} />
      </LiveRegion>
    </TermsProvider>
  );
}

function draftState(seed = 11) {
  let s = reducer(makeInitialState(dataset, seed), { type: "SET_ERA", min: 2000, max: 2011 });
  return reducer(s, { type: "START_DRAFT" });
}

describe("Draft", () => {
  it("draws three cuttings, opens a team sheet in shirt order, confirms and picks", () => {
    const spy = {};
    render(<Harness initial={draftState()} spy={spy} />);
    expect(screen.getByText("Nobody picked yet")).toBeTruthy();
    expect(screen.getByRole("group", { name: "Chalkboard" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Draw" }));
    const cuttings = within(screen.getByRole("list", { name: "Cuttings" })).getAllByRole("button");
    expect(cuttings).toHaveLength(3);
    expect(screen.getByTestId("live-region").textContent).toMatch(/3 cuttings drawn/);
    fireEvent.click(cuttings[0]);
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("in shirt order");
    const rows = dialog.querySelectorAll("li button");
    expect(rows.length).toBeGreaterThan(0);
    expect([...rows].every((r) => !/\b\d{2}\b/.test(r.querySelector("[class*=code]")?.textContent ?? ""))).toBe(true);
    fireEvent.click(rows[0]);
    const confirm = screen.getAllByRole("dialog").at(-1);
    expect(confirm.textContent).toContain("First pick");
    fireEvent.click(screen.getByRole("button", { name: "Pick" }));
    expect(spy.state.assignments[0].player).toBeTruthy();
    expect(screen.getByText("1 picked · 1 from the 2000s")).toBeTruthy();
    expect(screen.getByTestId("live-region").textContent).toMatch(/picked at goalkeeper\. Pick 2 of 11/);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("spends redraws and rubs out the ticks; the second pick shows the era cost", () => {
    const spy = {};
    render(<Harness initial={draftState(3)} spy={spy} />);
    fireEvent.click(screen.getByRole("button", { name: "Draw" }));
    const before = spy.state.draw.options;
    fireEvent.click(screen.getByRole("button", { name: /Redraw, 2 redraws left/ }));
    expect(spy.state.draw.redrawsLeft).toBe(1);
    expect(spy.state.draw.options).not.toEqual(before);
    fireEvent.click(screen.getByRole("button", { name: /Redraw, 1 redraw left/ }));
    expect(screen.getByRole("button", { name: /Redraw, no redraws left/ }).disabled).toBe(true);
    fireEvent.click(within(screen.getByRole("list", { name: "Cuttings" })).getAllByRole("button")[0]);
    fireEvent.click(screen.getByRole("dialog").querySelector("li button"));
    fireEvent.click(screen.getByRole("button", { name: "Pick" }));
    fireEvent.click(screen.getByRole("button", { name: "Draw" }));
    const other = spy.state.draw.options.find((o) => o.year !== spy.state.assignments[0].player.seasonKey.split("_")[0]);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(clubSeasonLabel(dataset, `${other.year}_${other.clubId}`)) }));
    fireEvent.click(screen.getByRole("dialog").querySelector("li button"));
    expect(screen.getAllByRole("dialog").at(-1).textContent).toMatch(/Era spread grows to \d+ years?: cohesion -\d/);
  });

  it("marks off-position rows when a cutting is relaxed and never sorts by rating", () => {
    const players = [
      { id: "a", name: "Old Striker", slot: "ST", side: null, age: 33, nat: "England", ov: 90, seasonKey: "2005_3" },
      { id: "b", name: "Young Keeper", slot: "GK", side: null, age: 19, nat: "Wales", ov: 60, seasonKey: "2005_3" },
      { id: "c", name: "Mid Back", slot: "CB", side: null, age: 27, nat: "Scotland", ov: 75, seasonKey: "2005_3" },
    ];
    expect(shirtOrder(players).map((p) => p.name)).toEqual(["Young Keeper", "Mid Back", "Old Striker"]);
    const base = reducer(draftState(3), { type: "SET_FORMATION", key: "4-1-4-1" });
    const assignments = base.assignments.map((a, i) => (i < 5 ? { ...a, player: { ...players[0], id: `f${i}`, slot: a.type } } : a));
    const draw = { spinning: false, redrawsLeft: 2, options: [{ year: "2005", clubId: "3", label: "Gamma Town 2005-06", players, relaxed: true }] };
    render(<Harness initial={{ ...base, phase: "draft", assignments, draw }} spy={{}} />);
    expect(screen.getByText("No defensive midfielders in this squad. Showing everyone.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Gamma Town/ }));
    expect(screen.getAllByText("off")).toHaveLength(3);
    fireEvent.click(screen.getByRole("dialog").querySelector("li button"));
    expect(screen.getAllByRole("dialog").at(-1).textContent).toContain("Not a defensive midfielder");
  });

  it("runs the ticker before landing when motion is allowed", () => {
    vi.useFakeTimers();
    const spy = {};
    render(<Harness initial={draftState()} instant={false} spy={spy} />);
    fireEvent.click(screen.getByRole("button", { name: "Draw" }));
    expect(screen.getByRole("log", { name: "Drawing" })).toBeTruthy();
    expect(spy.state.draw.spinning).toBe(true);
    act(() => { vi.advanceTimersByTime(1200); });
    expect(spy.state.draw.options).toHaveLength(3);
    vi.useRealTimers();
  });

  it("ends on the team-sheet slip once the XI is complete", () => {
    let s = draftState(7);
    while (!s.draftDone) {
      s = reducer(reducer(s, { type: "DRAW" }), { type: "LAND" });
      s = reducer(s, { type: "PICK_PLAYER", player: s.draw.options[0].players[0] });
    }
    render(<Harness initial={s} spy={{}} />);
    expect(screen.getByRole("heading", { name: /Your XI · 4-3-3/ })).toBeTruthy();
    expect(screen.getAllByText(/11 picked/)).toHaveLength(2);
    expect(screen.getAllByText(/Cohesion: /).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Draw" })).toBeNull();
  });
});
