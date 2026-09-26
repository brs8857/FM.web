import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import ClubTab from "./ClubTab.jsx";
import { recordSummary, biggestWin } from "./Record.jsx";
import { makeMiniDataset } from "../../../tests/fixtures/miniDataset.js";
import { playCareer } from "../../../tests/fixtures/playCareer.js";
import { createReducer, summarizeSeason } from "../../state/reducer.js";
import { makeInitialState } from "../../state/initialState.js";
import { selectSeasonHistory, selectTopScorers } from "../../state/selectors.js";
import { TermsProvider } from "../../ui/Term.jsx";
import terms from "../../content/terms.json";
import { encodeCareerCode } from "../../app/careerCode.js";
import { DEFAULT_PREFS } from "../../state/prefs.js";

const history = [
  { season: 1, position: 4, pts: 70, w: 20, d: 10, l: 8, gf: 60, ga: 40, tier: "Champions League", identity: "Gegenpress", familiarity: 60, seed: 1 },
  { season: 2, position: 1, pts: 88, w: 27, d: 7, l: 4, gf: 80, ga: 30, tier: "Champions", identity: null, familiarity: 75, seed: 1 },
  { season: 3, position: 2, pts: 84, w: 25, d: 9, l: 0, gf: 70, ga: 25, tier: "Champions League", identity: "Possession Control", familiarity: 80, seed: 1 },
];
const code = encodeCareerCode({ seed: 4242, eraMin: 2000, eraMax: 2011, formationKey: "4-3-3" });

function renderClub(props = {}) {
  const handlers = {
    onDismissNote: vi.fn(), setPrefs: vi.fn(), onExport: vi.fn(), onImportFile: vi.fn(() => Promise.resolve({ ok: false, message: "That file is damaged." })),
    onStartFromCode: vi.fn(), onNewCareer: vi.fn(), ...props,
  };
  render(
    <TermsProvider terms={terms}>
      <ClubTab history={history} careerComplete={false} careerCode={code} prefs={DEFAULT_PREFS} canExport storageAvailable {...handlers} />
    </TermsProvider>,
  );
  return handlers;
}

afterEach(() => vi.restoreAllMocks());

describe("Record", () => {
  it("summarises best finish, titles and unbeaten seasons", () => {
    expect(recordSummary([])).toBeNull();
    const s = recordSummary(history);
    expect(s.best.season).toBe(2);
    expect(s.titles).toBe(1);
    expect(s.unbeaten).toBe(1);
    expect(s.points).toBe(242);
  });
});

// Six seasons played through the reducer; the first as a save from before
// the match log would have recorded it.
function sixSeasons() {
  const dataset = makeMiniDataset();
  const state = playCareer({ reducer: createReducer(dataset), initialState: makeInitialState(dataset, 4242) });
  const played = selectSeasonHistory(state, summarizeSeason);
  return played.map((s, i) => (i === 0 ? { ...s, matches: [], topScorer: null } : s));
}

describe("the record's season sheets", () => {
  const six = sixSeasons();

  it("totals the career's top scorer and its biggest win across the logged seasons", () => {
    expect(six).toHaveLength(6);
    const summary = recordSummary(six);
    const [top] = selectTopScorers(six.flatMap((s) => s.matches), 1);
    expect(summary.topScorer).toEqual(top);
    const wins = six.flatMap((s) => s.matches).filter((m) => m.outcome === "W");
    expect(summary.biggestWin.margin).toBe(Math.max(...wins.map((m) => m.gf - m.ga)));
    expect(biggestWin([{ season: 1, matches: [] }])).toBeNull();
  });

  it("opens a season with its form, top scorers and match reports, and says so when a season has no log", () => {
    render(
      <TermsProvider terms={terms}>
        <ClubTab history={six} careerComplete careerCode={code} prefs={DEFAULT_PREFS} setPrefs={() => {}} onDismissNote={() => {}} canExport storageAvailable
          onExport={() => {}} onImportFile={() => {}} onStartFromCode={() => {}} onNewCareer={() => {}} />
      </TermsProvider>,
    );
    const summary = recordSummary(six);
    expect(screen.getByText(`${summary.topScorer.name} · ${summary.topScorer.goals}`)).toBeTruthy();
    expect(screen.getByText("Biggest win")).toBeTruthy();
    const perSeason = screen.getByRole("list", { name: "Top scorer each season" });
    expect(within(perSeason).getAllByRole("listitem")).toHaveLength(6);
    expect(within(perSeason).getAllByRole("listitem")[0].textContent).toBe("2026-27 · no match log");

    fireEvent.click(screen.getByRole("button", { name: "2026-27" }));
    let dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("No match log for this season.")).toBeTruthy();
    expect(within(dialog).queryByRole("list", { name: "Results" })).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "Close" }));

    const third = six[2];
    fireEvent.click(screen.getByRole("button", { name: "2028-29" }));
    dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Season 3 · 2028-29")).toBeTruthy();
    const count = (o) => third.matches.filter((m) => m.outcome === o).length;
    const last = third.matches.slice(-5).map((m) => m.outcome).join(" ");
    expect(within(dialog).getByText(`Won ${count("W")}, drawn ${count("D")}, lost ${count("L")}; last five: ${last}`)).toBeTruthy();
    const scorers = selectTopScorers(third.matches, 3);
    for (const s of scorers) expect(within(dialog).getByText(`${s.name} · ${s.goals}`)).toBeTruthy();
    const rows = within(within(dialog).getByRole("list", { name: "Results" })).getAllByRole("button");
    expect(rows).toHaveLength(38);
    fireEvent.click(rows[4]);
    expect(within(dialog).getByRole("article")).toBeTruthy();
  });
});

describe("ClubTab", () => {
  it("shows the record with the renamed verdicts, best finish and titles", () => {
    renderClub();
    expect(screen.getByText("1st · 2027-28")).toBeTruthy();
    expect(screen.getByText("1 title")).toBeTruthy();
    expect(screen.getAllByRole("row")).toHaveLength(4);
    expect(screen.getAllByText("Top five")).toHaveLength(2);
    expect(screen.getByText("Bespoke")).toBeTruthy();
  });

  it("copies the career code and starts a career from a typed one, rejecting bad codes", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.assign(navigator, { clipboard: { writeText } });
    const { onStartFromCode } = renderClub();
    expect(screen.getByTestId("career-code").textContent).toBe(code);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledWith(code);
    expect(await screen.findByText("Career code copied")).toBeTruthy();
    const input = screen.getByLabelText("Start a career from a code");
    fireEvent.change(input, { target: { value: "not a code" } });
    fireEvent.click(screen.getByRole("button", { name: "Start from code" }));
    expect(screen.getByRole("alert").textContent).toMatch(/doesn't look like a career code/);
    expect(onStartFromCode).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: code.toLowerCase() } });
    fireEvent.click(screen.getByRole("button", { name: "Start from code" }));
    expect(onStartFromCode).toHaveBeenCalledWith({ seed: 4242, eraMin: 2000, eraMax: 2011, formationKey: "4-3-3" });
  });

  it("exports and imports from the Saves section and shows the import message", async () => {
    const { onExport, onImportFile } = renderClub();
    fireEvent.click(screen.getByRole("button", { name: "Saves" }));
    fireEvent.click(screen.getByRole("button", { name: "Export save" }));
    expect(onExport).toHaveBeenCalledOnce();
    const file = new File(["x"], "x.json");
    fireEvent.change(screen.getByTestId("import-save-input"), { target: { files: [file] } });
    expect(onImportFile).toHaveBeenCalledWith(file);
    expect(await screen.findByText("That file is damaged.")).toBeTruthy();
  });

  it("changes the favourite club from Settings and names the current one in the chosen name mode", () => {
    const { setPrefs } = renderClub();
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    const fold = screen.getByRole("button", { name: /Colours/ });
    expect(fold.textContent).toContain("Pitch green");
    fireEvent.click(fold);
    fireEvent.click(screen.getByRole("radio", { name: "Aston Villa" }));
    expect(setPrefs).toHaveBeenCalledWith({ club: "aston-villa" });
    cleanup();
    render(
      <TermsProvider terms={terms}>
        <ClubTab history={history} careerComplete={false} careerCode={code} prefs={{ ...DEFAULT_PREFS, club: "arsenal", clubNames: "edited" }} setPrefs={() => {}}
          onDismissNote={() => {}} canExport storageAvailable onExport={() => {}} onImportFile={() => {}} onStartFromCode={() => {}} onNewCareer={() => {}} />
      </TermsProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getByRole("button", { name: /Colours/ }).textContent).toContain("Islington Reds");
    fireEvent.click(screen.getByRole("button", { name: /Colours/ }));
    expect(screen.getByRole("radio", { name: "Islington Reds", checked: true })).toBeTruthy();
  });

  it("shows the record as a slip with a new-career button when the career is complete", () => {
    const onNewCareer = vi.fn();
    render(
      <TermsProvider terms={terms}>
        <ClubTab history={history} careerComplete careerCode={code} prefs={DEFAULT_PREFS} setPrefs={() => {}} onDismissNote={() => {}} canExport storageAvailable
          onExport={() => {}} onImportFile={() => {}} onStartFromCode={() => {}} onNewCareer={onNewCareer} />
      </TermsProvider>,
    );
    expect(screen.getByRole("heading", { name: "2026-27 to 2031-32" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Start a new career" }));
    expect(onNewCareer).toHaveBeenCalledOnce();
  });
});
