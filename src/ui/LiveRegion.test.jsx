import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LiveRegion, { useAnnounce } from "./LiveRegion.jsx";

function Speaker() {
  const announce = useAnnounce();
  return <button type="button" onClick={() => announce("Tony Adams moved to centre-back")}>Move</button>;
}

describe("LiveRegion", () => {
  it("announces through a polite status region and re-announces repeats", () => {
    render(<LiveRegion><Speaker /></LiveRegion>);
    const region = screen.getByRole("status");
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(region.textContent).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "Move" }));
    expect(region.textContent).toBe("Tony Adams moved to centre-back");
    const first = region.firstChild;
    fireEvent.click(screen.getByRole("button", { name: "Move" }));
    expect(region.firstChild).not.toBe(first);
    expect(region.textContent).toBe("Tony Adams moved to centre-back");
  });
});
