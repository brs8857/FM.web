import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import V2Root from "./V2Root.jsx";
import { makeMiniDataset } from "../../tests/fixtures/miniDataset.js";
import { fakeStorage, makeSaveText } from "../../tests/fixtures/saves.js";
import { SAVE_KEY } from "../state/storage.js";
import { DEFAULT_PREFS } from "../state/prefs.js";
import { useShortcuts } from "./useShortcuts.js";

const prefs = { ...DEFAULT_PREFS, layout: "v2", seenNotes: ["first-run"] };

function Probe(props) {
  useShortcuts({ enabled: true, ...props });
  return <input aria-label="Code" />;
}

describe("shortcuts", () => {
  it("1–4 switch tabs and K runs the primary action in Club mode", () => {
    const storage = fakeStorage({ [SAVE_KEY]: makeSaveText() });
    render(<V2Root dataset={makeMiniDataset()} storage={storage} prefs={prefs} />);
    fireEvent.keyDown(window, { key: "2" });
    expect(screen.getByRole("heading", { level: 1, name: "Era XI" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Kick off season 3" }));
    fireEvent.keyDown(window, { key: "2" });
    expect(screen.getByRole("tab", { name: "Board", selected: true })).toBeTruthy();
    fireEvent.keyDown(window, { key: "4" });
    expect(screen.getByRole("tab", { name: "Club", selected: true })).toBeTruthy();
    fireEvent.keyDown(window, { key: "3" });
    fireEvent.keyDown(window, { key: "k" });
    expect(screen.getAllByRole("button", { name: "Start season 3" }).length).toBeGreaterThan(0);
  });

  it("D draws in the draft, and nothing fires while typing, with modifiers, or inside a sheet", () => {
    const storage = fakeStorage();
    render(<V2Root dataset={makeMiniDataset()} storage={storage} prefs={{ ...prefs, reduceMotion: "on" }} />);
    fireEvent.click(screen.getByRole("button", { name: "New career" }));
    fireEvent.keyDown(window, { key: "k" });
    fireEvent.keyDown(window, { key: "k" });
    expect(screen.getByRole("heading", { level: 1, name: "Draft" })).toBeTruthy();
    fireEvent.keyDown(window, { key: "d", ctrlKey: true });
    expect(screen.getByRole("button", { name: "Draw" })).toBeTruthy();
    fireEvent.keyDown(window, { key: "D" });
    expect(screen.getAllByRole("button", { name: /Club season/ })).toHaveLength(3);
    fireEvent.click(screen.getAllByRole("button", { name: /Club season/ })[0]);
    fireEvent.keyDown(window, { key: "1" });
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("ignores keys typed into a field", () => {
    const onTab = vi.fn();
    render(<Probe onTab={onTab} />);
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Code" }), { key: "1" });
    expect(onTab).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: "1" });
    expect(onTab).toHaveBeenCalledWith("squad");
  });
});
