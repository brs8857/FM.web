import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Chip from "./Chip.jsx";

describe("Chip", () => {
  it("is a toggle button with aria-pressed by default", () => {
    const onClick = vi.fn();
    render(<Chip selected onClick={onClick} sub="no identity bonus">Blank slate</Chip>);
    const chip = screen.getByRole("button", { name: /Blank slate/ });
    expect(chip.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("no identity bonus")).toBeTruthy();
    fireEvent.click(chip);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("becomes a radio with aria-checked when asked", () => {
    render(<Chip role="radio" selected={false}>Gegenpress</Chip>);
    const chip = screen.getByRole("radio", { name: "Gegenpress" });
    expect(chip.getAttribute("aria-checked")).toBe("false");
    expect(chip.hasAttribute("aria-pressed")).toBe(false);
  });
});
