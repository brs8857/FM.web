import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TopBar from "./TopBar.jsx";

describe("TopBar", () => {
  it("is a banner with a heading, optional back button and slots", () => {
    const onBack = vi.fn();
    render(<TopBar title="Board" subtitle="Season 3 · 2028-29" onBack={onBack} next={<span>Next slot</span>} end={<span>End slot</span>} />);
    expect(screen.getByRole("banner")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "Board" })).toBeTruthy();
    expect(screen.getByText("Season 3 · 2028-29")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalledOnce();
    expect(screen.getByText("Next slot")).toBeTruthy();
    expect(screen.getByText("End slot")).toBeTruthy();
  });

  it("omits the back button when there is nowhere to go", () => {
    render(<TopBar title="Home" />);
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
  });
});
