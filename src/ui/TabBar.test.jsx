import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TabBar from "./TabBar.jsx";

const tabs = [
  { key: "squad", label: "Squad" },
  { key: "board", label: "Board" },
  { key: "season", label: "Season", badge: true },
  { key: "club", label: "Club" },
];

describe("TabBar", () => {
  it("is a tablist whose tabs control their panels", () => {
    render(<TabBar tabs={tabs} value="board" onChange={() => {}} />);
    expect(screen.getByRole("tablist").getAttribute("aria-orientation")).toBe("horizontal");
    const board = screen.getByRole("tab", { name: "Board" });
    expect(board.getAttribute("aria-selected")).toBe("true");
    expect(board.getAttribute("aria-controls")).toBe("panel-board");
    expect(screen.getAllByRole("tab").map((t) => t.tabIndex)).toEqual([-1, 0, -1, -1]);
  });

  it("moves with arrow keys in the bar's orientation", () => {
    const onChange = vi.fn();
    const { rerender } = render(<TabBar tabs={tabs} value="club" onChange={onChange} />);
    const list = screen.getByRole("tablist");
    fireEvent.keyDown(list, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith("squad");
    fireEvent.keyDown(list, { key: "ArrowDown" });
    expect(onChange).toHaveBeenCalledTimes(1);

    rerender(<TabBar tabs={tabs} value="squad" onChange={onChange} orientation="vertical" />);
    expect(screen.getByRole("tablist").getAttribute("aria-orientation")).toBe("vertical");
    fireEvent.keyDown(screen.getByRole("tablist"), { key: "ArrowDown" });
    expect(onChange).toHaveBeenLastCalledWith("board");
    expect(document.activeElement).toBe(screen.getByRole("tab", { name: "Board" }));
  });

  it("selects on click", () => {
    const onChange = vi.fn();
    render(<TabBar tabs={tabs} value="squad" onChange={onChange} />);
    fireEvent.click(screen.getByRole("tab", { name: "Season" }));
    expect(onChange).toHaveBeenCalledWith("season");
  });
});
