import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import App from "./App.jsx";
import { makeMiniDataset } from "../../tests/fixtures/miniDataset.js";
import { fakeStorage, makeSaveText, makeSeason3OpenState } from "../../tests/fixtures/saves.js";
import { selectNextAction } from "../state/selectors.js";
import { SAVE_KEY } from "../state/storage.js";
import { DEFAULT_PREFS, PREFS_KEY } from "../state/prefs.js";
import { encodeCareerCode } from "./careerCode.js";
import { CLUB_THEME_ID } from "./useDocumentPrefs.js";

const prefs = { ...DEFAULT_PREFS, seenNotes: ["first-run"] };

describe("App", () => {
  it("shows the three first-run slips once, then goes straight into New career", () => {
    const storage = fakeStorage();
    render(<App dataset={makeMiniDataset()} storage={storage} prefs={{ ...DEFAULT_PREFS }} />);
    expect(screen.getByRole("region", { name: "1 of 3" })).toBeTruthy();
    expect(screen.queryByRole("heading", { level: 1, name: "Era XI" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("region", { name: "3 of 3" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Start a career" }));
    expect(screen.getByRole("heading", { level: 1, name: "New career" })).toBeTruthy();
    expect(JSON.parse(storage.data.get(PREFS_KEY)).seenNotes).toContain("first-run");
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { level: 1, name: "Era XI" })).toBeTruthy();
  });

  it("dismisses a coach's note for good", () => {
    const storage = fakeStorage({ [SAVE_KEY]: makeSaveText() });
    render(<App dataset={makeMiniDataset()} storage={storage} prefs={prefs} />);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss note" }));
    expect(screen.queryByRole("note")).toBeNull();
    expect(JSON.parse(storage.data.get(PREFS_KEY)).seenNotes).toEqual(["first-run", "home"]);
  });

  it("boots on Home, resumes a save into Club mode on the tab the next action needs", () => {
    const storage = fakeStorage({ [SAVE_KEY]: makeSaveText() });
    const { unmount } = render(<App dataset={makeMiniDataset()} storage={storage} prefs={{ ...prefs, theme: "dark" }} />);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(screen.getByText("Season 3 · 2028-29")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Kick off season 3" }));
    expect(screen.getByRole("tab", { name: "Season", selected: true })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Kick off season 3" })).toHaveLength(2);
    fireEvent.click(screen.getByRole("tab", { name: "Club" }));
    expect(screen.getByRole("tabpanel", { name: "Club" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("tab", { name: "Season", selected: true })).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Kick off season 3" })[1]);
    expect(screen.getAllByRole("button", { name: "Start season 3" }).length).toBeGreaterThan(0);
    expect(JSON.parse(storage.data.get(SAVE_KEY)).state.phase).toBe("reveal");
    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    expect(screen.getByRole("heading", { level: 1, name: "Era XI" })).toBeTruthy();
    unmount();
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it("resumes a season in progress on match day and plays it from the sticky bar, the K key and Play to…", () => {
    const state = makeSeason3OpenState(11);
    const storage = fakeStorage({ [SAVE_KEY]: makeSaveText(state) });
    render(<App dataset={makeMiniDataset()} storage={storage} prefs={{ ...prefs, reduceMotion: "on" }} />);
    const label = (s) => selectNextAction(s).label;
    expect(label(state)).toMatch(/^Play week 12: .+ \([HA]\)$/);
    fireEvent.click(screen.getByRole("button", { name: label(state) }));
    expect(screen.getByRole("tab", { name: "Season", selected: true })).toBeTruthy();
    expect(screen.getByRole("article", { name: /Your XI/ })).toBeTruthy();
    const saved = () => JSON.parse(storage.data.get(SAVE_KEY)).state;
    fireEvent.click(screen.getAllByRole("button", { name: label(state) }).at(-1));
    expect(saved().campaign.week).toBe(13);
    fireEvent.click(screen.getByRole("tab", { name: "Board" }));
    const week13 = saved();
    fireEvent.keyDown(window, { key: "k" });
    expect(saved().campaign.week).toBe(14);
    expect(screen.getByRole("tab", { name: "Season", selected: true })).toBeTruthy();
    expect(label(week13)).not.toBe(label(saved()));
    fireEvent.click(screen.getByRole("button", { name: "Play to…" }));
    fireEvent.click(screen.getByRole("radio", { name: /The end of the season/ }));
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    expect(saved().phase).toBe("result");
    expect(screen.getByRole("button", { name: "Share" })).toBeTruthy();
  });

  it("walks a new career from Home through era, shape and colours into the draft", () => {
    const storage = fakeStorage();
    const { unmount } = render(<App dataset={makeMiniDataset()} storage={storage} prefs={prefs} />);
    expect(screen.queryByRole("tablist")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "New career" }));
    expect(screen.getByRole("heading", { level: 1, name: "New career" })).toBeTruthy();
    expect(screen.getByText("1 of 3 · Era")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "The 2000s" }));
    fireEvent.click(screen.getByRole("button", { name: "Choose a shape" }));
    fireEvent.click(screen.getByRole("radio", { name: "4-4-2" }));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("2000-01 to 2009-10")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Choose a shape" }));
    fireEvent.click(screen.getByRole("button", { name: "Choose your colours" }));
    expect(screen.getByText("3 of 3 · Colours")).toBeTruthy();
    expect(screen.getByRole("radio", { name: /^Pitch/, checked: true })).toBeTruthy();
    expect(document.getElementById(CLUB_THEME_ID)).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "Arsenal FC" }));
    expect(JSON.parse(storage.data.get(PREFS_KEY)).club).toBe("arsenal");
    expect(document.getElementById(CLUB_THEME_ID).textContent).toContain("--paper:");
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("radio", { name: "4-4-2", checked: true })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Choose your colours" }));
    fireEvent.click(screen.getByRole("button", { name: "Start the draft" }));
    expect(screen.getByRole("heading", { level: 1, name: "Draft" })).toBeTruthy();
    expect(JSON.parse(storage.data.get(SAVE_KEY)).state).toMatchObject({ phase: "draft", formationKey: "4-4-2", eraMin: 2000, eraMax: 2009 });
    expect(JSON.parse(storage.data.get(SAVE_KEY)).state.club).toBeUndefined();
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(screen.getByRole("heading", { name: "Pick 1 of 11" })).toBeTruthy();
    unmount();
    expect(document.getElementById(CLUB_THEME_ID)).toBeNull();
  });

  it("asks before a new career replaces a saved one, and writes preference changes", () => {
    const storage = fakeStorage({ [SAVE_KEY]: makeSaveText() });
    render(<App dataset={makeMiniDataset()} storage={storage} prefs={prefs} />);
    fireEvent.click(screen.getByRole("button", { name: "New career" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(storage.data.has(SAVE_KEY)).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "New career" }));
    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(storage.data.has(SAVE_KEY)).toBe(false);
    expect(screen.getByRole("heading", { level: 1, name: "New career" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    fireEvent.click(screen.getByRole("radio", { name: "Dark" }));
    expect(JSON.parse(storage.data.get(PREFS_KEY)).theme).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("imports a save, asking before it replaces a career", async () => {
    const storage = fakeStorage();
    const { unmount } = render(<App dataset={makeMiniDataset()} storage={storage} prefs={prefs} />);
    fireEvent.click(screen.getByRole("button", { name: "New career" }));
    fireEvent.click(screen.getByRole("button", { name: "Choose a shape" }));
    fireEvent.click(screen.getByRole("button", { name: "Choose your colours" }));
    fireEvent.click(screen.getByRole("button", { name: "Start the draft" }));
    const saved = JSON.parse(storage.data.get(SAVE_KEY));
    expect(saved.state.phase).toBe("draft");
    unmount();

    const club = fakeStorage({ [SAVE_KEY]: makeSaveText() });
    render(<App dataset={makeMiniDataset()} storage={club} prefs={prefs} />);
    fireEvent.click(screen.getByRole("button", { name: "Club" }));
    fireEvent.click(screen.getByRole("button", { name: "Saves" }));
    const file = new File([JSON.stringify(saved)], "save.json", { type: "application/json" });
    fireEvent.change(screen.getByTestId("import-save-input"), { target: { files: [file] } });
    expect(await screen.findByRole("heading", { name: "Replace your career with this save?" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Load the save" }));
    expect(JSON.parse(club.data.get(SAVE_KEY)).state.phase).toBe("draft");
    expect(screen.getAllByRole("heading", { level: 1, name: "Draft" }).length).toBeGreaterThan(0);
  });

  it("starts a career from a code with its era and shape", () => {
    const storage = fakeStorage({ [SAVE_KEY]: makeSaveText() });
    render(<App dataset={makeMiniDataset()} storage={storage} prefs={prefs} />);
    fireEvent.click(screen.getByRole("button", { name: "Club" }));
    const code = encodeCareerCode({ seed: 77, eraMin: 2005, eraMax: 2011, formationKey: "5-3-2" });
    fireEvent.change(screen.getByLabelText("Start a career from a code"), { target: { value: code } });
    fireEvent.click(screen.getByRole("button", { name: "Start from code" }));
    expect(screen.getByRole("heading", { name: "Start a career from this code?" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(screen.getByRole("heading", { level: 1, name: "New career" })).toBeTruthy();
    expect(screen.getByText("2005-06 to 2011-12")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Choose a shape" }));
    expect(screen.getByRole("radio", { name: "5-3-2", checked: true })).toBeTruthy();
    expect(storage.data.has(SAVE_KEY)).toBe(false);
  });

  it("renders the gallery route and reads stored preferences by default", () => {
    render(<App dataset={makeMiniDataset()} storage={fakeStorage()} search="?gallery=1" />);
    expect(screen.getByRole("heading", { level: 1, name: "Pitch" })).toBeTruthy();
    cleanup();
    const storage = fakeStorage({ [PREFS_KEY]: JSON.stringify({ theme: "dark", seenNotes: ["first-run"] }) });
    render(<App dataset={makeMiniDataset()} storage={storage} search="" />);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(screen.getByRole("heading", { level: 1, name: "Era XI" })).toBeTruthy();
  });
});
