import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { useReducer, useState } from "react";
import SeasonTab from "./SeasonTab.jsx";
import { runningPosition, resultLine, ordinal, HALF_SEASON, TICK_MS } from "./Vidiprinter.jsx";
import { eligibleSlots } from "./Window.jsx";
import { slipFor } from "./BackPage.jsx";
import { REVEAL_MS } from "./TeamSheetReveal.jsx";
import LiveRegion from "../../ui/LiveRegion.jsx";
import { TermsProvider } from "../../ui/Term.jsx";
import terms from "../../content/terms.json";
import { makeMiniDataset } from "../../../tests/fixtures/miniDataset.js";
import { makeSeason3TacticsState } from "../../../tests/fixtures/saves.js";
import { createReducer } from "../../state/reducer.js";
import { tacticUntouched } from "../../state/selectors.js";
import { clubSeasonLabel } from "../../content/clubs.js";
import { DEFAULT_PREFS } from "../../state/prefs.js";
import { DEFAULT_INSTRUCTIONS } from "../../engine/instructions.js";
import { tierLabel } from "../../content/labels.js";
import * as share from "../../app/share.js";

const dataset = makeMiniDataset();
const reducer = createReducer(dataset);
const clubName = (n) => n;

function Harness({ initial, instant = true, spy = {} }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const [feedDoneSeason, setFeedDoneSeason] = useState(null);
  spy.state = state;
  const feedDone = state.phase === "result" && (instant || feedDoneSeason === state.season);
  return (
    <TermsProvider terms={terms}>
      <LiveRegion>
        <SeasonTab state={state} dispatch={dispatch} identity="Gegenpress" familiarity={64} tacticUntouched={tacticUntouched(state)}
          instant={instant} feedDone={feedDone} onFeedDone={() => setFeedDoneSeason(state.season)} careerCode="AA-BB-CC-DD-EE-FF"
          clubSeason={(k) => clubSeasonLabel(dataset, k)} clubName={clubName} prefs={DEFAULT_PREFS} onDismissNote={() => {}} onGoBoard={spy.onGoBoard ?? (() => {})} />
      </LiveRegion>
    </TermsProvider>
  );
}

const resultState = () => reducer(reducer(makeSeason3TacticsState(), { type: "SIMULATE" }), { type: "KICKOFF" });

// Each timer schedules the next from an effect, so advance one tick per act.
function ticks(n, ms) {
  for (let i = 0; i < n; i++) act(() => { vi.advanceTimersByTime(ms); });
}

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("Season helpers", () => {
  it("formats results for the teleprinter and ordinals", () => {
    expect(resultLine({ week: 3, opponent: "Rival 2", home: true, gf: 2, ga: 1, outcome: "W" }, clubName)).toMatchObject({ id: 3, tone: "win" });
    expect(resultLine({ week: 12, opponent: "Rival 2", home: false, gf: 0, ga: 0, outcome: "D" }, clubName).text).toBe("WK 12  RIVAL 2 (A)                0-0  D");
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd"]);
  });

  it("scales the running position by the week", () => {
    const sim = resultState().simulation;
    const full = runningPosition(sim, sim.matches.length);
    expect(full.pts).toBe(sim.pts);
    expect(full.position).toBe(sim.position);
    expect(runningPosition(sim, 0)).toMatchObject({ pts: 0, w: 0, d: 0, l: 0 });
  });

  it("finds the slots a candidate can fill, falling back to every slot", () => {
    const { assignments } = makeSeason3TacticsState();
    expect(eligibleSlots(assignments, { slot: "CB" })).toEqual(["CB1", "CB2"]);
    expect(eligibleSlots(assignments, { slot: "DM" })).toHaveLength(11);
  });
});

describe("SeasonTab", () => {
  it("shows pre-season with the opposition and a nudge to the board when nothing is set", () => {
    const untouched = { ...makeSeason3TacticsState(), selectedStyle: null, instructions: { ...DEFAULT_INSTRUCTIONS } };
    const spy = { onGoBoard: vi.fn() };
    render(<Harness initial={untouched} spy={spy} />);
    expect(screen.getByRole("heading", { name: "Season 3 · 2028-29" })).toBeTruthy();
    expect(screen.getByRole("list").querySelectorAll("li")).toHaveLength(19);
    fireEvent.click(screen.getByRole("button", { name: "Go to the board" }));
    expect(spy.onGoBoard).toHaveBeenCalledOnce();
  });

  it("marks the promoted clubs in pre-season", () => {
    const state = makeSeason3TacticsState();
    render(<Harness initial={state} />);
    expect(screen.queryByRole("note", { name: "Nothing on the board yet" })).toBeNull();
    expect(screen.getAllByText("promoted")).toHaveLength(state.lastTransition.promoted.length);
  });

  it("stamps the ratings in one at a time, then the average and Start season", () => {
    vi.useFakeTimers();
    const spy = {};
    const state = reducer(makeSeason3TacticsState(), { type: "SIMULATE" });
    render(<Harness initial={state} instant={false} spy={spy} />);
    expect(screen.getAllByLabelText("not yet revealed")).toHaveLength(11);
    ticks(3, REVEAL_MS + 1);
    expect(screen.getAllByLabelText("not yet revealed")).toHaveLength(8);
    ticks(9, REVEAL_MS + 1);
    expect(screen.queryByLabelText("not yet revealed")).toBeNull();
    expect(screen.getByText("Squad average")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Start season 3" }));
    expect(spy.state.phase).toBe("result");
  });

  it("types the results in, pauses at the half-season slip, announces only then, and ends on the back page", () => {
    vi.useFakeTimers();
    const state = resultState();
    render(<Harness initial={state} instant={false} />);
    const log = screen.getByRole("log", { name: "Vidiprinter" });
    expect(log.getAttribute("aria-live")).toBe("off");
    ticks(5, TICK_MS + 1);
    expect(log.querySelectorAll("li")).toHaveLength(5);
    expect(screen.getByTestId("live-region").textContent).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(screen.getByTestId("live-region").textContent).toMatch(/^Paused\. WK {2}5 .* Week 5 · \d+(st|nd|rd|th) · \d+ pts?\.$/);
    ticks(3, TICK_MS + 1);
    expect(log.querySelectorAll("li")).toHaveLength(5);
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    ticks(14, TICK_MS + 1);
    expect(log.querySelectorAll("li")).toHaveLength(HALF_SEASON);
    expect(screen.getByRole("heading", { name: /at the turn/ })).toBeTruthy();
    expect(screen.getByTestId("live-region").textContent).toMatch(/^Half-season\. Won \d+, drawn \d+, lost \d+\. Week 19/);
    ticks(3, TICK_MS + 1);
    expect(log.querySelectorAll("li")).toHaveLength(HALF_SEASON);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    ticks(2, TICK_MS + 1);
    expect(log.querySelectorAll("li")).toHaveLength(HALF_SEASON + 2);
    fireEvent.click(screen.getByRole("button", { name: "Skip to end" }));
    expect(screen.getByRole("heading", { level: 2, name: tierLabel(state.simulation.tier).name })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Share" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Final table/ }).getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(screen.getByRole("button", { name: /Final table/ }));
    expect(screen.getByRole("row", { name: /Your XI/ })).toBeTruthy();
  });

  it("shows the back page straight away when resumed, and shares the slip", async () => {
    const state = resultState();
    const spy = vi.spyOn(share, "shareSlip").mockResolvedValue("downloaded");
    render(<Harness initial={state} instant />);
    expect(screen.queryByRole("log", { name: "Vidiprinter" })).toBeNull();
    expect(screen.getByText(/Finished \d+(st|nd|rd|th)/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    expect(spy).toHaveBeenCalledWith(slipFor(state, "AA-BB-CC-DD-EE-FF"));
    expect(await screen.findByText("Slip saved and the caption copied.")).toBeTruthy();
    expect(slipFor(state, "X").eleven).toHaveLength(11);
  });

  it("runs the window: sign to bench, replace through the highlighted board, and league changes", () => {
    const spy = {};
    const state = reducer(resultState(), { type: "GOTO_TRANSFER" });
    render(<Harness initial={state} spy={spy} />);
    expect(screen.getByRole("note", { name: "League changes" }).textContent).toMatch(/went down; .* came up\./);
    const candidates = screen.getAllByRole("button", { name: "Sign to bench" });
    expect(candidates).toHaveLength(5);
    fireEvent.click(candidates[0]);
    expect(spy.state.shortlist[0].signed).toBe(true);
    expect(screen.getByText("Signed")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Replace…" })[0]);
    const board = screen.getByRole("group", { name: "Chalkboard" });
    const highlighted = [...board.querySelectorAll('[class*="highlighted"]')];
    expect(highlighted.length).toBeGreaterThan(0);
    expect(screen.getByText(/Tap a highlighted marker/)).toBeTruthy();
    const before = spy.state.assignments.map((a) => a.player.id);
    fireEvent.pointerDown(highlighted[0], { button: 0, clientX: 1, clientY: 1 });
    fireEvent.pointerUp(highlighted[0], { clientX: 1, clientY: 1 });
    expect(spy.state.shortlist[1].signed).toBe(true);
    expect(spy.state.assignments.map((a) => a.player.id)).not.toEqual(before);
    expect(screen.getByTestId("live-region").textContent).toMatch(/signed at .*, replacing/);
    const other = within(board).getAllByRole("button")[0];
    fireEvent.pointerDown(other, { button: 0, clientX: 1, clientY: 1 });
    fireEvent.pointerUp(other, { clientX: 1, clientY: 1 });
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
