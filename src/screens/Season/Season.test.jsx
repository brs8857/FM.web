import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { useReducer, useState } from "react";
import SeasonTab from "./SeasonTab.jsx";
import { resultLine, ordinal, positionText, HALF_SEASON, TICK_MS } from "./Vidiprinter.jsx";
import { minuteLabel, signed } from "./MatchReport.jsx";
import { settleNote } from "../Board/IdentityLine.jsx";
import PlayToSheet, { playToOptions } from "./PlayToSheet.jsx";
import { eligibleSlots } from "./Window.jsx";
import { slipFor } from "./BackPage.jsx";
import { REVEAL_MS } from "./TeamSheetReveal.jsx";
import LiveRegion from "../../ui/LiveRegion.jsx";
import { TermsProvider } from "../../ui/Term.jsx";
import terms from "../../content/terms.json";
import { makeMiniDataset } from "../../../tests/fixtures/miniDataset.js";
import { makeSeason3TacticsState, makeSeason3State, makeSeason3OpenState, makeSeason3ResultState } from "../../../tests/fixtures/saves.js";
import { createReducer, lineupFor } from "../../state/reducer.js";
import { tacticUntouched, selectNextFixture, selectTopScorers } from "../../state/selectors.js";
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
  const [feed, setFeed] = useState(null);
  spy.state = state;
  spy.dispatch = dispatch;
  spy.playTo = (until) => { if (!instant) setFeed(state.campaign.week); dispatch({ type: "PLAY_TO", until }); };
  const { familiarity, profile } = lineupFor(state);
  return (
    <TermsProvider terms={terms}>
      <LiveRegion>
        <SeasonTab state={state} dispatch={dispatch} identity="Gegenpress" familiarity={familiarity} profile={profile} tacticUntouched={tacticUntouched(state)}
          instant={instant} feed={feed} onFeedDone={() => setFeed(null)} careerCode="AA-BB-CC-DD-EE-FF"
          clubSeason={(k) => clubSeasonLabel(dataset, k)} clubName={clubName} prefs={DEFAULT_PREFS} onDismissNote={() => {}}
          onGoBoard={spy.onGoBoard ?? (() => {})} onGoTab={spy.onGoTab ?? (() => {})} />
      </LiveRegion>
    </TermsProvider>
  );
}

const resultState = () => makeSeason3ResultState();

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

  it("says in words what settling does to the next match", () => {
    expect(settleNote({ matches: 0, modifier: -3, changed: true })).toBe("Just changed: cohesion −3 this match");
    expect(settleNote({ matches: 0, modifier: -3, changed: false })).toBe("First match in this system: cohesion −3");
    expect(settleNote({ matches: 2, modifier: -1, changed: false })).toBe("Bedding in: 2 matches in this system, cohesion −1");
    expect(settleNote({ matches: 9, modifier: 0, changed: false })).toBe("Settled in: 9 matches in this system");
    expect(settleNote({ matches: 9, modifier: 3, changed: false })).toBe("Settled in: 9 matches in this system (+3)");
  });

  it("prints minutes, stoppage time and signed modifiers the report's way", () => {
    expect([1, 45, 90, 91, 95].map(minuteLabel)).toEqual(["1'", "45'", "90'", "90+1'", "90+5'"]);
    expect([3, 0, -2].map(signed)).toEqual(["+3", "±0", "−2"]);
    expect(positionText(12, { position: 4, pts: 24 })).toBe("Week 12 · 4th · 24 pts");
  });

  it("offers the half only before it, and every run stops at the end", () => {
    expect(playToOptions(1).map((o) => o.key)).toEqual(["next", "half", "defeat", "end"]);
    expect(playToOptions(19).find((o) => o.key === "half").sub).toBe("Week 19");
    expect(playToOptions(20).map((o) => o.key)).toEqual(["next", "defeat", "end"]);
    expect(playToOptions(20).find((o) => o.key === "defeat").sub).toBe("Or week 38");
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

  it("names who retired over the summer and any empty place in the XI", () => {
    const base = makeSeason3TacticsState();
    const retired = { ...base, lastTransition: { ...base.lastTransition, retired: ["Alpha FC GK0 2000", "Beta United ST19 2001"] } };
    render(<Harness initial={retired} />);
    expect(screen.getByRole("note", { name: "Retired" }).textContent).toBe("RetiredAlpha FC GK0 2000, Beta United ST19 2001 have hung up the boots.");
    const hole = { ...retired, assignments: base.assignments.map((a, i) => (i === 0 ? { ...a, player: null, role: null, duty: null } : a)) };
    render(<Harness initial={hole} />);
    expect(screen.getAllByRole("note", { name: "Retired" })[1].textContent).toMatch(/One place in the XI is empty: fill it from the Squad tab before kick-off\.$/);
  });

  it("marks the promoted clubs in pre-season and says what the seasons in this system are worth", () => {
    const state = makeSeason3TacticsState();
    render(<Harness initial={state} />);
    expect(screen.queryByRole("note", { name: "Nothing on the board yet" })).toBeNull();
    expect(screen.getAllByText("promoted")).toHaveLength(state.lastTransition.promoted.length);
    expect(state.cohesionMemory.seasons).toBe(2);
    expect(screen.getByText("2 seasons in this system already: cohesion +4.")).toBeTruthy();
  });

  it("stamps the ratings in one at a time, then the average and Start season", () => {
    vi.useFakeTimers();
    const spy = {};
    const state = makeSeason3State();
    render(<Harness initial={state} instant={false} spy={spy} />);
    expect(screen.getAllByLabelText("not yet revealed")).toHaveLength(11);
    ticks(3, REVEAL_MS + 1);
    expect(screen.getAllByLabelText("not yet revealed")).toHaveLength(8);
    ticks(9, REVEAL_MS + 1);
    expect(screen.queryByLabelText("not yet revealed")).toBeNull();
    expect(screen.getByText("Squad average")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Start season 3" }));
    expect(spy.state.phase).toBe("matchday");
  });

  it("opens match day on the first fixture: no report yet, the opponent, and a way to the board and squad", () => {
    const spy = { onGoTab: vi.fn() };
    const state = makeSeason3State(0);
    const fixture = selectNextFixture(state);
    render(<Harness initial={state} spy={spy} />);
    expect(screen.getByText("Week 1 of 38 · kick-off")).toBeTruthy();
    expect(screen.queryByText("Last match")).toBeNull();
    const card = screen.getByText(`Next · Week 1 · ${fixture.home ? "Home" : "Away"}`).closest("article");
    expect(within(card).getByText(fixture.name)).toBeTruthy();
    expect(within(card).getByText(fixture.promoted ? "promoted" : "Opening day")).toBeTruthy();
    expect(screen.getByText(/^First match in this system: cohesion −3/)).toBeTruthy();
    expect(screen.getByRole("meter", { name: "Attack" }).getAttribute("aria-valuetext")).toMatch(new RegExp(`${fixture.name} \\d+$`));
    fireEvent.click(screen.getByRole("button", { name: "Board" }));
    fireEvent.click(screen.getByRole("button", { name: "Squad" }));
    expect(spy.onGoTab.mock.calls).toEqual([["board"], ["squad"]]);
  });

  it("shows the last report, the table after it, and announces each match once", () => {
    const spy = {};
    render(<Harness initial={makeSeason3OpenState(11)} spy={spy} />);
    const last = spy.state.campaign.log[10];
    const report = screen.getByRole("article", { name: /Your XI/ });
    expect(within(report).getByText(`Week 11 · ${last.home ? "Home" : "Away"}`)).toBeTruthy();
    const heading = within(report).getByRole("heading");
    expect(heading.textContent).toBe(last.home ? `Your XI ${last.gf} — ${last.ga} ${last.opponent}` : `${last.opponent} ${last.ga} — ${last.gf} Your XI`);
    for (const g of last.goals.filter((goal) => goal.us)) expect(within(report).getAllByText(g.name).length).toBeGreaterThan(0);
    expect(within(report).getByText(/^After week 11 · \d+(st|nd|rd|th) · \d+ pts?$/)).toBeTruthy();
    expect(screen.getByText(/^Week 12 of 38 · \d+(st|nd|rd|th) · \d+ pts?$/)).toBeTruthy();
    expect(screen.getByTestId("live-region").textContent).toBe("");

    act(() => spy.dispatch({ type: "PLAY_MATCH" }));
    expect(screen.getByTestId("live-region").textContent).toMatch(/^WK 12 .* After week 12 · \d+(st|nd|rd|th) · \d+ pts?\.$/);
    expect(screen.getByText(/^Week 13 of 38/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Season so far/ }));
    const results = screen.getByRole("list", { name: "Results" });
    const rows = within(results).getAllByRole("button");
    expect(rows).toHaveLength(12);
    expect(rows[0].getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(rows[0]);
    expect(rows[0].getAttribute("aria-expanded")).toBe("true");
    expect(within(results).getByRole("article")).toBeTruthy();
    expect(screen.getByRole("table", { name: /Table after week 12/ })).toBeTruthy();
  });

  it("prints the cards and who misses the next match, and sends a banned starter's manager to the squad", () => {
    const spy = { onGoTab: vi.fn() };
    const base = makeSeason3OpenState(3);
    const starter = base.assignments.find((a) => a.slotId === "CB1").player;
    const last = { ...base.campaign.log[2], cards: [{ minute: 44, slotId: "CB1", id: starter.id, name: starter.name, kind: "red" }], bans: [starter.name] };
    const state = { ...base, bench: makeSeason3State(0).bench, campaign: { ...base.campaign, log: [...base.campaign.log.slice(0, 2), last] }, discipline: { [starter.id]: { yellows: 0, banned: 1 } } };
    render(<Harness initial={state} spy={spy} />);
    const report = screen.getByRole("article", { name: /Your XI/ });
    expect(within(report).getByText(`Booked: —. Sent off: ${starter.name} 44'.`)).toBeTruthy();
    expect(within(report).getByText(`${starter.name} misses the next match`)).toBeTruthy();
    const note = screen.getByRole("note", { name: "Suspended" });
    expect(note.textContent).toContain(`${starter.name} is banned for this match.`);
    fireEvent.click(within(note).getByRole("button", { name: "Go to the squad" }));
    expect(spy.onGoTab).toHaveBeenCalledWith("squad");
  });

  it("marks a system changed this week in the next report", () => {
    const spy = {};
    render(<Harness initial={makeSeason3OpenState(3)} spy={spy} />);
    act(() => spy.dispatch({ type: "SET_INSTRUCTION", key: "mentality", value: 10 }));
    expect(screen.getByText("Just changed: cohesion −3 this match")).toBeTruthy();
    act(() => spy.dispatch({ type: "PLAY_MATCH" }));
    const report = screen.getByRole("article", { name: /Your XI/ });
    expect(within(report).getByText("Changed this week")).toBeTruthy();
    expect(within(report).getByText("Contain")).toBeTruthy();
  });

  it("types a fast-forward in, pauses at the half-season slip, announces only then, and ends on the back page", () => {
    vi.useFakeTimers();
    const spy = {};
    render(<Harness initial={makeSeason3OpenState(0)} instant={false} spy={spy} />);
    act(() => spy.playTo("end"));
    const state = spy.state;
    expect(state.phase).toBe("result");
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

  it("feeds only the weeks a run played, back to match day, with no slip when it stops at the half", () => {
    vi.useFakeTimers();
    const spy = {};
    render(<Harness initial={makeSeason3OpenState(10)} instant={false} spy={spy} />);
    act(() => spy.playTo("half"));
    expect(spy.state.campaign.week).toBe(20);
    const log = screen.getByRole("log", { name: "Vidiprinter" });
    ticks(9, TICK_MS + 1);
    expect(log.querySelectorAll("li")).toHaveLength(9);
    expect(log.querySelector("li").textContent).toMatch(/^WK 11 /);
    expect(screen.queryByRole("heading", { name: /at the turn/ })).toBeNull();
    ticks(1, TICK_MS + 1);
    expect(screen.queryByRole("log", { name: "Vidiprinter" })).toBeNull();
    expect(screen.getByText(/^Week 20 of 38/)).toBeTruthy();
  });

  it("Play to… is a sheet of runs that plays the one chosen", () => {
    const onPlay = vi.fn(), onClose = vi.fn();
    render(<TermsProvider terms={terms}><PlayToSheet open week={12} onPlay={onPlay} onClose={onClose} /></TermsProvider>);
    const dialog = screen.getByRole("dialog", { name: "Play to…" });
    const group = within(dialog).getByRole("radiogroup", { name: "Play to" });
    expect(within(group).getAllByRole("radio").map((r) => r.textContent)).toEqual(["Next matchWeek 12", "The halfWeeks 12–19", "The next defeatOr week 19", "The end of the seasonWeeks 12–38"]);
    expect(within(group).getByRole("radio", { name: /Next match/ }).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(within(group).getByRole("radio", { name: /The next defeat/ }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Play" }));
    expect(onPlay).toHaveBeenCalledWith("defeat");
    expect(onClose).toHaveBeenCalled();
  });

  it("puts the season's top scorer under the record and a report behind every match", () => {
    const state = resultState();
    render(<Harness initial={state} />);
    const [top] = selectTopScorers(state.simulation.matches, 1);
    expect(screen.getByText(`Top scorer: ${top.name}, ${top.goals} goal${top.goals === 1 ? "" : "s"}`)).toBeTruthy();
    expect(slipFor(state, "X").topScorer).toBe(`Top scorer: ${top.name}, ${top.goals} goal${top.goals === 1 ? "" : "s"}`);
    fireEvent.click(screen.getByRole("button", { name: /Matches/ }));
    const rows = within(screen.getByRole("list", { name: "Results" })).getAllByRole("button");
    expect(rows).toHaveLength(38);
    fireEvent.click(rows[37]);
    expect(screen.getByRole("article", { name: /Your XI/ })).toBeTruthy();
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
    const opened = reducer(resultState(), { type: "GOTO_TRANSFER" });
    const state = { ...opened, transferBudget: { points: 9, spent: 0 } };
    render(<Harness initial={state} spy={spy} />);
    expect(screen.getByRole("note", { name: "League changes" }).textContent).toMatch(/went down; .* came up\./);
    expect(screen.getByText("9 wage points of 9 left.")).toBeTruthy();
    const candidates = screen.getAllByRole("button", { name: "Sign to bench" });
    expect(candidates).toHaveLength(8);
    fireEvent.click(candidates[0]);
    expect(spy.state.shortlist[0].signed).toBe(true);
    expect(spy.state.transferBudget.spent).toBe(state.shortlist[0].cost);
    expect(screen.getByText("Signed")).toBeTruthy();
    expect(screen.getByText(`${9 - state.shortlist[0].cost} wage points of 9 left.`)).toBeTruthy();
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

  it("puts candidates the budget cannot cover out of reach", () => {
    const opened = reducer(resultState(), { type: "GOTO_TRANSFER" });
    const state = { ...opened, transferBudget: { points: 1, spent: 0 } };
    render(<Harness initial={state} />);
    const cheap = state.shortlist.filter((e) => e.cost <= 1).length;
    expect(screen.queryAllByRole("button", { name: "Sign to bench" })).toHaveLength(cheap);
    expect(screen.getAllByText("Out of reach")).toHaveLength(8 - cheap);
  });
});
