import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Cutting from "./Cutting.jsx";

describe("Cutting", () => {
  it("opens as a button named by its header", () => {
    const onOpen = vi.fn();
    render(<Cutting kicker="Club season" title="Leeds United 2000-01" subtitle="2 centre-backs" note="No wingers in this squad — showing everyone" onOpen={onOpen} />);
    const cutting = screen.getByRole("button", { name: /Leeds United 2000-01/ });
    expect(cutting.getAttribute("aria-haspopup")).toBe("dialog");
    expect(cutting.textContent).toContain("2 centre-backs");
    expect(cutting.textContent).toContain("showing everyone");
    fireEvent.click(cutting);
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it("is a plain article when it cannot be opened", () => {
    render(<Cutting title="Arsenal 1997-98" subtitle="Champions" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("article").textContent).toContain("Arsenal 1997-98");
  });
});
