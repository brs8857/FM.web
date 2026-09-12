import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ErrorBoundary from "./ErrorBoundary.jsx";
import { fakeStorage, makeSaveText } from "../../../tests/fixtures/saves.js";
import { SAVE_KEY, CORRUPT_KEY } from "../../state/storage.js";
import { APP_VERSION } from "../../version.js";

function Boom() {
  throw new Error("boom");
}

describe("ErrorBoundary", () => {
  beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());

  it("shows the error, version and career seed, and can export the autosave", () => {
    const text = makeSaveText();
    const storage = fakeStorage({ [SAVE_KEY]: text });
    const exportFn = vi.fn(() => Promise.resolve("downloaded"));
    render(<ErrorBoundary storage={storage} reload={vi.fn()} exportFn={exportFn}><Boom /></ErrorBoundary>);

    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeTruthy();
    expect(screen.getByText(/boom/)).toBeTruthy();
    expect(screen.getByText(new RegExp(`Version ${APP_VERSION}`))).toBeTruthy();
    expect(screen.getByText(new RegExp(`Career seed ${JSON.parse(text).state.careerSeed}`))).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Export save" }));
    expect(exportFn).toHaveBeenCalledWith(text, "fmweb-save.json");
  });

  it("Start new game keeps the save aside and reloads", () => {
    const text = makeSaveText();
    const storage = fakeStorage({ [SAVE_KEY]: text });
    const reload = vi.fn();
    render(<ErrorBoundary storage={storage} reload={reload}><Boom /></ErrorBoundary>);
    fireEvent.click(screen.getByRole("button", { name: "Start new game" }));
    expect(storage.data.get(CORRUPT_KEY)).toBe(text);
    expect(storage.data.has(SAVE_KEY)).toBe(false);
    expect(reload).toHaveBeenCalledOnce();
  });

  it("hides Export when there is no save, and Reload reloads", () => {
    const reload = vi.fn();
    render(<ErrorBoundary storage={null} reload={reload}><Boom /></ErrorBoundary>);
    expect(screen.queryByRole("button", { name: "Export save" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Reload" }));
    expect(reload).toHaveBeenCalledOnce();
  });
});
