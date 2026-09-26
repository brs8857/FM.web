import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Gallery from "./Gallery.jsx";
import { clubTheme } from "../../content/clubTheme.js";

describe("Gallery", () => {
  it("previews any club's derived colours on both columns", () => {
    render(<Gallery />);
    const light = screen.getByTestId("gallery-light");
    const dark = screen.getByTestId("gallery-dark");
    expect(light.style.getPropertyValue("--paper")).toBe("");
    fireEvent.change(screen.getByRole("combobox", { name: "Colours" }), { target: { value: "aston-villa" } });
    const theme = clubTheme("aston-villa");
    expect(light.style.getPropertyValue("--paper")).toBe(theme.light.paper);
    expect(light.style.getPropertyValue("--slate")).toBe(theme.light.slate);
    expect(dark.style.getPropertyValue("--paper")).toBe(theme.dark.paper);
    expect(screen.getByText("Aston Villa · dark")).toBeTruthy();
    fireEvent.change(screen.getByRole("combobox", { name: "Colours" }), { target: { value: "" } });
    expect(light.style.getPropertyValue("--paper")).toBe("");
  });

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
