import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Stamp from "./Stamp.jsx";

describe("Stamp", () => {
  it("shows the number with its label and carries the stamp motion class", () => {
    const { rerender } = render(<Stamp value={84} label="Squad average" />);
    expect(screen.getByText("84").parentElement.className).toContain("stamp");
    expect(screen.getByText("Squad average")).toBeTruthy();
    const first = screen.getByText("84").parentElement;
    rerender(<Stamp value={85} label="Squad average" />);
    expect(screen.getByText("85").parentElement).not.toBe(first);
  });
});
