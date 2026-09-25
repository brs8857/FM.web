import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Meter from "./Meter.jsx";

describe("Meter", () => {
  it("exposes the value and its word to assistive tech", () => {
    render(<Meter label="Cohesion" value={63} valueLabel="Settled" />);
    const meter = screen.getByRole("meter", { name: "Cohesion" });
    expect(meter.getAttribute("aria-valuenow")).toBe("63");
    expect(meter.getAttribute("aria-valuemax")).toBe("100");
    expect(meter.getAttribute("aria-valuetext")).toBe("Settled, 63 of 100");
    expect(screen.getByText("Settled")).toBeTruthy();
  });
});
