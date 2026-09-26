import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import axe from "axe-core";
import App from "../../src/app/App.jsx";
import { makeMiniDataset } from "../fixtures/miniDataset.js";
import { fakeStorage, makeSaveText, makeSeason3TacticsState, makeSeason3State, makeSeason3OpenState, makeSeason3ResultState } from "../fixtures/saves.js";
import { createReducer } from "../../src/state/reducer.js";
import { makeInitialState } from "../../src/state/initialState.js";
import { SAVE_KEY } from "../../src/state/storage.js";
import { DEFAULT_PREFS } from "../../src/state/prefs.js";

// Every screen, checked with axe in jsdom (spec 04 §8.11). Colour contrast
// is asserted by scripts/check-contrast.mjs on the token pairs, since jsdom
// has no layout to compute it from; the Playwright run covers it for real.
const dataset = makeMiniDataset();
const reducer = createReducer(dataset);
const prefs = { ...DEFAULT_PREFS, seenNotes: ["first-run"] };
const firstRunPrefs = { ...DEFAULT_PREFS };

// Serious and critical are the gate (spec 04 §8.11); moderate and minor are
// held at zero too, so a regression in landmarks or heading order shows up.
async function check(name) {
  const results = await axe.run(document.body, { rules: { "color-contrast": { enabled: false } } });
  const report = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.html).join(" | ")}`).join("\n");
  expect(results.violations, `${name}\n${report}`).toEqual([]);
  expect(results.passes.length).toBeGreaterThan(15);
}

function draftState(seed = 11) {
  let s = reducer(makeInitialState(dataset, seed), { type: "SET_ERA", min: 2000, max: 2011 });
  s = reducer(s, { type: "START_DRAFT" });
  return reducer(reducer(s, { type: "DRAW" }), { type: "LAND" });
}

const resultState = () => makeSeason3ResultState();

function mount(state, extra = {}) {
  const storage = fakeStorage(state ? { [SAVE_KEY]: makeSaveText(state) } : {});
  render(<App dataset={dataset} storage={storage} prefs={{ ...prefs, ...extra }} />);
}

afterEach(cleanup);

// A full axe pass over a whole screen takes seconds in jsdom (the season test
// is ~4 s on an idle machine), so the 5 s default flakes on a loaded runner.
describe("axe: every screen", { timeout: 30_000 }, () => {
  it("first run", async () => {
    mount(null, firstRunPrefs);
    await check("first run");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await check("first run, slip 2");
  });

  it("home, with and without a career", async () => {
    mount(null);
    await check("home, empty");
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    await check("settings sheet");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "About" }));
    await check("about sheet");
    cleanup();
    mount(makeSeason3TacticsState());
    await check("home, resume card");
  });

  it("era, shape and colours", async () => {
    mount(null);
    fireEvent.click(screen.getByRole("button", { name: "New career" }));
    await check("era");
    fireEvent.click(screen.getByRole("button", { name: "Choose a shape" }));
    await check("shape");
    fireEvent.click(screen.getByRole("button", { name: "Choose your colours" }));
    await check("colours");
    fireEvent.click(screen.getByRole("radio", { name: "Aston Villa" }));
    await check("colours, club chosen");
  });

  it("draft: cuttings, team sheet and confirm", async () => {
    mount(draftState());
    fireEvent.click(screen.getByRole("button", { name: "Continue the draft" }));
    await check("draft, cuttings on the desk");
    fireEvent.click(within(screen.getByRole("list", { name: "Cuttings" })).getAllByRole("button")[0]);
    await check("cutting sheet");
    fireEvent.click(screen.getByRole("dialog").querySelector("li button"));
    await check("confirm pick");
  });

  it("squad tab and the player sheet", async () => {
    mount(makeSeason3TacticsState());
    fireEvent.click(screen.getByRole("button", { name: "Club" }));
    fireEvent.click(screen.getByRole("tab", { name: "Squad" }));
    await check("squad");
    fireEvent.click(screen.getByRole("heading", { name: "Team sheet" }).parentElement.querySelector("li button"));
    await check("player sheet");
    fireEvent.click(screen.getByRole("button", { name: "Swap with…" }));
    await check("swap list");
  });

  it("board tab with the groups open", async () => {
    mount(makeSeason3TacticsState());
    fireEvent.click(screen.getByRole("button", { name: "Club" }));
    fireEvent.click(screen.getByRole("tab", { name: "Board" }));
    fireEvent.click(screen.getByRole("button", { name: /In possession/ }));
    fireEvent.click(screen.getByRole("button", { name: /Out of possession/ }));
    await check("board");
    fireEvent.click(screen.getByRole("button", { name: "About Tempo" }));
    await check("term sheet");
  });

  it("season: pre-season, reveal, match day, play to, back page, window", async () => {
    mount(makeSeason3TacticsState());
    fireEvent.click(screen.getByRole("button", { name: "Kick off season 3" }));
    await check("pre-season");
    cleanup();
    mount(makeSeason3State(), { reduceMotion: "on" });
    fireEvent.click(screen.getByRole("button", { name: "Start season 3" }));
    await check("reveal");
    cleanup();
    mount(makeSeason3State(0), { reduceMotion: "on" });
    fireEvent.click(screen.getByRole("button", { name: /^Play week 1: / }));
    await check("match day, week 1");
    cleanup();
    mount(makeSeason3OpenState(11), { reduceMotion: "on" });
    fireEvent.click(screen.getByRole("button", { name: /^Play week 12: / }));
    await check("match day with a report");
    fireEvent.click(screen.getByRole("button", { name: /Season so far/ }));
    fireEvent.click(within(screen.getByRole("list", { name: "Results" })).getAllByRole("button")[0]);
    await check("match day, season so far and a report row open");
    fireEvent.click(screen.getByRole("button", { name: "Play to…" }));
    await check("play to sheet");
    cleanup();
    mount(resultState(), { reduceMotion: "off" });
    fireEvent.click(screen.getByRole("button", { name: "Open the window" }));
    await check("back page (resumed)");
    fireEvent.click(screen.getByRole("button", { name: /Final table/ }));
    fireEvent.click(screen.getByRole("button", { name: /Matches/ }));
    await check("back page, folds open");
    cleanup();
    mount(reducer(resultState(), { type: "GOTO_TRANSFER" }));
    fireEvent.click(screen.getByRole("button", { name: "Close the window" }));
    await check("window");
    fireEvent.click(screen.getAllByRole("button", { name: "Replace…" })[0]);
    await check("window, replacing");
  });

  it("club tab with every fold open", async () => {
    mount(reducer(resultState(), { type: "GOTO_TRANSFER" }));
    fireEvent.click(screen.getByRole("button", { name: "Club" }));
    for (const name of ["Saves", "Settings", "About"]) fireEvent.click(screen.getByRole("button", { name }));
    await check("club");
    fireEvent.click(screen.getByRole("button", { name: "2028-29" }));
    fireEvent.click(within(screen.getByRole("list", { name: "Results" })).getAllByRole("button")[0]);
    await check("record, season sheet with a report open");
  });
});
