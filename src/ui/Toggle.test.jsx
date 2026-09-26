import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Toggle from "./Toggle.jsx";

describe("Toggle", () => {
  it("is a switch that reports the flipped value", () => {
    const onChange = vi.fn();
    render(<Toggle label="Offside trap" sub="high line needed" checked={false} onChange={onChange} />);
    const toggle = screen.getByRole("switch", { name: /Offside trap/ });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("reflects a checked state", () => {
    render(<Toggle label="Haptics" checked onChange={() => {}} />);
    expect(screen.getByRole("switch", { name: "Haptics" }).getAttribute("aria-checked")).toBe("true");
  });
});
