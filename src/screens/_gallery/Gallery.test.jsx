import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Gallery from "./Gallery.jsx";

describe("Gallery", () => {
  it("renders every primitive in both themes", () => {
    render(<Gallery />);
    expect(screen.getByRole("heading", { level: 1, name: "Pitch" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "Floodlit" })).toBeTruthy();
    expect(screen.getAllByRole("radiogroup", { name: "Style" })).toHaveLength(2);
    expect(screen.getAllByRole("tablist")).toHaveLength(4);
    expect(screen.getAllByRole("log")).toHaveLength(2);
    expect(screen.getAllByRole("table", { name: "Final table" })).toHaveLength(2);
    fireEvent.click(screen.getAllByRole("button", { name: "Open sheet" })[0]);
    expect(screen.getByRole("dialog", { name: "Cohesion" })).toBeTruthy();
  });
});
