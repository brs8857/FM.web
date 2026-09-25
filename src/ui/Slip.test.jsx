import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Slip from "./Slip.jsx";

describe("Slip", () => {
  it("is a region labelled by its title", () => {
    render(<Slip kicker="Season 3" title="Team sheet"><p>Eleven names</p></Slip>);
    const region = screen.getByRole("region", { name: "Team sheet" });
    expect(region.className).toContain("slip");
    expect(region.textContent).toContain("Eleven names");
  });

  it("can skip the motion", () => {
    render(<Slip animate={false}><p>Static</p></Slip>);
    expect(screen.getByText("Static").parentElement.className.split(" ")).not.toContain("slip");
  });
});
