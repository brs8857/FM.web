import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FMWeb from "../../src/App.jsx";
import { makeMiniDataset } from "../fixtures/miniDataset.js";
import { fakeStorage, makeSaveText } from "../fixtures/saves.js";
import { SAVE_KEY, CORRUPT_KEY } from "../../src/state/storage.js";

afterEach(() => vi.restoreAllMocks());

describe("App saves", () => {
  it("offers to continue a saved career and resumes it", async () => {
    const storage = fakeStorage({ [SAVE_KEY]: makeSaveText() });
    render(<FMWeb dataset={makeMiniDataset()} storage={storage} />);
    expect(screen.getByText("Season 3 · 2028-29 · Tactics")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Continue career" }));
    expect(await screen.findByRole("button", { name: /Reveal Ratings & Simulate/ })).toBeTruthy();
  });

  it("asks before a new draft replaces the saved career", () => {
    const text = makeSaveText();
    const storage = fakeStorage({ [SAVE_KEY]: text });
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<FMWeb dataset={makeMiniDataset()} storage={storage} />);

    fireEvent.click(screen.getByRole("button", { name: /Start the draft/ }));
    expect(confirm).toHaveBeenCalledWith("Start a new career? Your saved career (Season 3 · 2028-29) will be replaced.");
    expect(storage.data.get(SAVE_KEY)).toBe(text);

    fireEvent.click(screen.getByRole("button", { name: /Start the draft/ }));
    expect(screen.getByText(/Now drafting/)).toBeTruthy();
    expect(JSON.parse(storage.data.get(SAVE_KEY)).state.phase).toBe("draft");
  });

  it("starts fresh with a notice when the autosave is corrupt", () => {
    const storage = fakeStorage({ [SAVE_KEY]: "{broken" });
    render(<FMWeb dataset={makeMiniDataset()} storage={storage} />);
    expect(screen.getByText(/Your saved career couldn't be loaded/)).toBeTruthy();
    expect(storage.data.get(CORRUPT_KEY)).toBe("{broken");
  });

  it("warns when saving is unavailable", () => {
    render(<FMWeb dataset={makeMiniDataset()} storage={null} />);
    expect(screen.getByText(/Saving isn't available in this browser/)).toBeTruthy();
  });
});
