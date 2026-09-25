import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ChipRow from "./ChipRow.jsx";

const options = [
  { key: "gegenpress", label: "Gegenpress" },
  { key: "possession", label: "Possession" },
  { key: "balanced", label: "Blank slate", sub: "no identity bonus" },
];

describe("ChipRow", () => {
  it("is a labelled radiogroup with one tab stop on the selected chip", () => {
    render(<ChipRow label="Style" options={options} value="possession" onChange={() => {}} />);
    expect(screen.getByRole("radiogroup", { name: "Style" })).toBeTruthy();
    const radios = screen.getAllByRole("radio");
    expect(radios.map((r) => r.getAttribute("aria-checked"))).toEqual(["false", "true", "false"]);
    expect(radios.map((r) => r.tabIndex)).toEqual([-1, 0, -1]);
  });

  it("moves selection and focus with arrow keys, wrapping at the ends", () => {
    const onChange = vi.fn();
    const { rerender } = render(<ChipRow label="Style" options={options} value="balanced" onChange={onChange} />);
    const group = screen.getByRole("radiogroup");
    screen.getByRole("radio", { name: /Blank slate/ }).focus();
    fireEvent.keyDown(group, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("gegenpress");
    expect(document.activeElement).toBe(screen.getByRole("radio", { name: "Gegenpress" }));

    rerender(<ChipRow label="Style" options={options} value="gegenpress" onChange={onChange} />);
    fireEvent.keyDown(group, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenLastCalledWith("balanced");
    fireEvent.keyDown(group, { key: "End" });
    expect(onChange).toHaveBeenLastCalledWith("balanced");
    fireEvent.keyDown(group, { key: "Home" });
    expect(onChange).toHaveBeenLastCalledWith("gegenpress");
  });

  it("selects on click", () => {
    const onChange = vi.fn();
    render(<ChipRow label="Style" options={options} value="gegenpress" onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "Possession" }));
    expect(onChange).toHaveBeenCalledWith("possession");
  });
});
