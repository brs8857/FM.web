import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import StrengthTable from "./StrengthTable.jsx";

describe("StrengthTable", () => {
  it("prints each strength beside the comparison and the gap", () => {
    render(<StrengthTable referenceLabel="Average opponent" rows={[
      { key: "attack", label: "Attack", value: 72.4, reference: 65.2 },
      { key: "defence", label: "Defence", value: 58, reference: 61 },
      { key: "press", label: "Press", value: 60, reference: 60 },
    ]} />);
    expect(screen.getByRole("columnheader", { name: "Average opponent" })).toBeTruthy();
    expect(within(screen.getByRole("row", { name: /Attack/ })).getAllByRole("cell").map((c) => c.textContent)).toEqual(["72", "65", "+7"]);
    expect(within(screen.getByRole("row", { name: /Defence/ })).getAllByRole("cell").map((c) => c.textContent)).toEqual(["58", "61", "−3"]);
    expect(within(screen.getByRole("row", { name: /Press/ })).getAllByRole("cell")[2].textContent).toBe("level");
  });

  it("drops the comparison columns when there is nothing to compare with", () => {
    render(<StrengthTable rows={[{ key: "attack", label: "Attack", value: 70 }]} />);
    expect(screen.getAllByRole("columnheader")).toHaveLength(2);
  });
});
