import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Table from "./Table.jsx";

const columns = [
  { key: "position", label: "#", mono: true },
  { key: "name", label: "Club" },
  { key: "pts", label: "Pts", align: "right", mono: true },
];
const rows = [
  { position: 1, name: "Rival 1", pts: 88, isUser: false },
  { position: 2, name: "Your XI", pts: 84, isUser: true },
];

describe("Table", () => {
  it("is a captioned table with column headers and a highlighted row", () => {
    render(<Table caption="Final table" columns={columns} rows={rows} rowKey={(r) => r.name} isHighlighted={(r) => r.isUser} />);
    expect(screen.getByRole("table", { name: "Final table" })).toBeTruthy();
    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["#", "Club", "Pts"]);
    const yours = screen.getByRole("row", { name: /Your XI/ });
    expect(yours.className).toContain("highlight");
    expect(screen.getByRole("row", { name: /Rival 1/ }).className).not.toContain("highlight");
  });
});
