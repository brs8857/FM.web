import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Segmented from "./Segmented.jsx";

const options = [{ key: "system", label: "System" }, { key: "light", label: "Light" }, { key: "dark", label: "Dark" }];

describe("Segmented", () => {
  it("exposes radios with a single tab stop and arrow-key movement", () => {
    const onChange = vi.fn();
    render(<Segmented label="Theme" options={options} value="light" onChange={onChange} />);
    const group = screen.getByRole("radiogroup", { name: "Theme" });
    const radios = screen.getAllByRole("radio");
    expect(radios.map((r) => r.getAttribute("aria-checked"))).toEqual(["false", "true", "false"]);
    expect(radios.map((r) => r.tabIndex)).toEqual([-1, 0, -1]);
    radios[1].focus();
    fireEvent.keyDown(group, { key: "ArrowDown" });
    expect(onChange).toHaveBeenCalledWith("dark");
    expect(document.activeElement).toBe(radios[2]);
    fireEvent.click(radios[0]);
    expect(onChange).toHaveBeenLastCalledWith("system");
  });
});
