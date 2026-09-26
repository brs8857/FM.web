import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TeamSheetRow from "./TeamSheetRow.jsx";

describe("TeamSheetRow", () => {
  it("is a list item with a button when it can be opened", () => {
    const onClick = vi.fn();
    render(<ul><TeamSheetRow code="CB" name="Tony Adams" meta="31 · England" job="Blocker · Hold" selected onClick={onClick} /></ul>);
    const button = screen.getByRole("button", { name: /Tony Adams/ });
    expect(button.getAttribute("aria-current")).toBe("true");
    expect(button.textContent).toContain("Blocker · Hold");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("spells out an off-position mark", () => {
    render(<ul><TeamSheetRow code="ST" name="Alan Smith" mark={{ label: "off", title: "Not a centre-back" }} /></ul>);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("listitem").textContent).toContain("Not a centre-back");
    expect(screen.getByTitle("Not a centre-back")).toBeTruthy();
  });
});
