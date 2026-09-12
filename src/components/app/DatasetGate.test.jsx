import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DatasetGate from "./DatasetGate.jsx";

describe("DatasetGate", () => {
  it("shows a loading state, then renders children with the dataset", async () => {
    const load = vi.fn(() => Promise.resolve({ opponents: [1, 2, 3] }));
    render(<DatasetGate load={load}>{(d) => <p>{d.opponents.length} rivals</p>}</DatasetGate>);
    expect(screen.getByRole("status").textContent).toMatch(/Loading player data/);
    expect(await screen.findByText("3 rivals")).toBeTruthy();
  });

  it("shows an error with Retry, and retries the load", async () => {
    const load = vi.fn()
      .mockImplementationOnce(() => Promise.reject(new Error("offline")))
      .mockImplementationOnce(() => Promise.resolve({ opponents: [] }));
    render(<DatasetGate load={load}>{() => <p>ready</p>}</DatasetGate>);
    expect(await screen.findByText(/Couldn't load player data/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("ready")).toBeTruthy();
    expect(load).toHaveBeenCalledTimes(2);
  });
});
