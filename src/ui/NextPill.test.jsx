import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NextPill from "./NextPill.jsx";

describe("NextPill", () => {
  it("is a button that names the next action", () => {
    const onClick = vi.fn();
    render(<NextPill label="Kick off season 3" onClick={onClick} />);
    const pill = screen.getByRole("button", { name: "Kick off season 3" });
    expect(pill.textContent).toBe("NextKick off season 3");
    fireEvent.click(pill);
    expect(onClick).toHaveBeenCalledOnce();
  });
});
