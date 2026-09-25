import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import V2Root from "./V2Root.jsx";
import { makeMiniDataset } from "../../tests/fixtures/miniDataset.js";
import { fakeStorage, makeSaveText } from "../../tests/fixtures/saves.js";
import { SAVE_KEY } from "../state/storage.js";
import { DEFAULT_PREFS } from "../state/prefs.js";

const prefs = { ...DEFAULT_PREFS, layout: "v2" };

describe("V2Root", () => {
  it("marks the document, resumes a save into Club mode on the tab the next action needs", () => {
    const storage = fakeStorage({ [SAVE_KEY]: makeSaveText() });
    const { unmount } = render(<V2Root dataset={makeMiniDataset()} storage={storage} prefs={{ ...prefs, theme: "dark" }} />);
    expect(document.documentElement.dataset.layout).toBe("v2");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(screen.getByRole("tab", { name: "Season", selected: true })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Kick off season 3" })).toHaveLength(2);
    expect(screen.getByText("Season 3 · 2028-29")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Club" }));
    expect(screen.getByRole("tabpanel", { name: "Club" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("tab", { name: "Season", selected: true })).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Kick off season 3" })[1]);
    expect(screen.getAllByRole("button", { name: "Start season 3" })).toHaveLength(2);
    expect(JSON.parse(storage.data.get(SAVE_KEY)).state.phase).toBe("reveal");
    unmount();
    expect(document.documentElement.dataset.layout).toBeUndefined();
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it("starts in set-up mode with no tab bar when there is no save", () => {
    render(<V2Root dataset={makeMiniDataset()} storage={fakeStorage()} prefs={prefs} />);
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.getByRole("heading", { level: 1, name: "New career" })).toBeTruthy();
    expect(screen.getByText(/Next: Start the draft/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Start the draft" }));
    expect(screen.getByRole("heading", { level: 1, name: "Draft" })).toBeTruthy();
    expect(screen.getByText(/Next: Draft in progress: pick 1 of 11/)).toBeTruthy();
  });

  it("renders the gallery route", () => {
    render(<V2Root dataset={makeMiniDataset()} storage={fakeStorage()} prefs={prefs} gallery />);
    expect(screen.getByRole("heading", { level: 1, name: "Newsprint" })).toBeTruthy();
  });
});
