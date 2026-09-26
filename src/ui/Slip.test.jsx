import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Slip from "./Slip.jsx";

describe("Slip", () => {
  it("is a region labelled by its title, and still unless it is arriving", () => {
    render(<Slip kicker="Season 3" title="Team sheet"><p>Eleven names</p></Slip>);
    const region = screen.getByRole("region", { name: "Team sheet" });
    expect(region.className.split(" ")).not.toContain("slip");
    expect(region.textContent).toContain("Eleven names");
  });

  it("slides in when it arrives", () => {
    render(<Slip animate><p>New</p></Slip>);
    expect(screen.getByText("New").parentElement.className.split(" ")).toContain("slip");
  });
});
