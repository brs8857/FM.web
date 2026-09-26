import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StrengthBars from "./StrengthBars.jsx";

describe("StrengthBars", () => {
  it("renders one meter per bar with the reference in the spoken text", () => {
    render(<StrengthBars bars={[
      { key: "attack", label: "Attack", value: 72.4, reference: 65.2 },
      { key: "defence", label: "Defence", value: 58 },
    ]} />);
    const attack = screen.getByRole("meter", { name: "Attack" });
    expect(attack.getAttribute("aria-valuenow")).toBe("72");
    expect(attack.getAttribute("aria-valuetext")).toBe("Attack 72, opponents' average 65");
    expect(attack.querySelectorAll("span")).toHaveLength(2);
    const defence = screen.getByRole("meter", { name: "Defence" });
    expect(defence.getAttribute("aria-valuetext")).toBe("Defence 58");
    expect(defence.querySelectorAll("span")).toHaveLength(1);
  });
});
