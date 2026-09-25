import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import V2Root from "./V2Root.jsx";
import { makeMiniDataset } from "../../tests/fixtures/miniDataset.js";
import { fakeStorage, makeSaveText } from "../../tests/fixtures/saves.js";
import { SAVE_KEY } from "../state/storage.js";
import { DEFAULT_PREFS, PREFS_KEY } from "../state/prefs.js";

const prefs = { ...DEFAULT_PREFS, layout: "v2" };

describe("V2Root", () => {
  it("boots on Home, resumes a save into Club mode on the tab the next action needs", () => {
    const storage = fakeStorage({ [SAVE_KEY]: makeSaveText() });
    const { unmount } = render(<V2Root dataset={makeMiniDataset()} storage={storage} prefs={{ ...prefs, theme: "dark" }} />);
    expect(document.documentElement.dataset.layout).toBe("v2");
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
    expect(document.documentElement.dataset.layout).toBeUndefined();
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it("walks a new career from Home through era and shape into the draft", () => {
    const storage = fakeStorage();
    render(<V2Root dataset={makeMiniDataset()} storage={storage} prefs={prefs} />);
    expect(screen.queryByRole("tablist")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "New career" }));
    expect(screen.getByRole("heading", { level: 1, name: "New career" })).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "The 2000s" }));
    fireEvent.click(screen.getByRole("button", { name: "Choose a shape" }));
    fireEvent.click(screen.getByRole("radio", { name: "4-4-2" }));
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("2000-01 to 2009-10")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Choose a shape" }));
    fireEvent.click(screen.getByRole("button", { name: "Start the draft" }));
    expect(screen.getByRole("heading", { level: 1, name: "Draft" })).toBeTruthy();
    expect(JSON.parse(storage.data.get(SAVE_KEY)).state).toMatchObject({ phase: "draft", formationKey: "4-4-2", eraMin: 2000, eraMax: 2009 });
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(screen.getByRole("heading", { name: "Pick 1 of 11" })).toBeTruthy();
  });

  it("asks before a new career replaces a saved one, and writes preference changes", () => {
    const storage = fakeStorage({ [SAVE_KEY]: makeSaveText() });
    render(<V2Root dataset={makeMiniDataset()} storage={storage} prefs={prefs} />);
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

  it("renders the gallery route", () => {
    render(<V2Root dataset={makeMiniDataset()} storage={fakeStorage()} prefs={prefs} gallery />);
    expect(screen.getByRole("heading", { level: 1, name: "Newsprint" })).toBeTruthy();
  });
});
