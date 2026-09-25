import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Disclosure from "./Disclosure.jsx";

describe("Disclosure", () => {
  it("wires aria-expanded and aria-controls to the hidden panel", () => {
    render(<Disclosure title="In possession" summary="Short · Narrow · Cross late"><p>Dials</p></Disclosure>);
    const button = screen.getByRole("button", { name: /In possession/ });
    const panel = document.getElementById(button.getAttribute("aria-controls"));
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(panel.hidden).toBe(true);
    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(panel.hidden).toBe(false);
    expect(screen.getByText("Dials")).toBeTruthy();
  });

  it("can be controlled", () => {
    const onToggle = vi.fn();
    render(<Disclosure title="Out of possession" open onToggle={onToggle}><p>More dials</p></Disclosure>);
    const button = screen.getByRole("button", { name: /Out of possession/ });
    expect(button.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledWith(false);
    expect(button.getAttribute("aria-expanded")).toBe("true");
  });
});
