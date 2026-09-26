import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Ticker from "./Ticker.jsx";

const lines = [
  { id: 1, text: "WK 1  ARSENAL (A)  1-1", tone: "draw" },
  { id: 2, text: "WK 2  LEEDS (H)    3-0", tone: "win" },
];

describe("Ticker", () => {
  it("is a silent log unless asked to announce", () => {
    const { rerender } = render(<Ticker lines={lines} />);
    const log = screen.getByRole("log", { name: "Vidiprinter" });
    expect(log.getAttribute("aria-live")).toBe("off");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    rerender(<Ticker lines={lines} announce />);
    expect(log.getAttribute("aria-live")).toBe("polite");
  });

  it("types only the latest line and can cap the visible lines", () => {
    render(<Ticker lines={[...lines, "WK 3  SPURS (A)    0-2"]} maxLines={2} />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0].className).not.toContain("type");
    expect(items[1].className).toContain("type");
    expect(items[1].textContent).toBe("WK 3  SPURS (A)    0-2");
  });
});
