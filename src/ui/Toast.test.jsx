import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import Toast from "./Toast.jsx";

describe("Toast", () => {
  it("announces through a status region and dismisses itself", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<Toast open message="Career code copied" onClose={onClose} duration={1000} />);
    expect(screen.getByRole("status").textContent).toBe("Career code copied");
    act(() => { vi.advanceTimersByTime(1000); });
    expect(onClose).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it("offers an action and stays empty when closed", () => {
    const onAction = vi.fn();
    const { rerender } = render(<Toast open message="Saved" action="Undo" onAction={onAction} onClose={() => {}} duration={0} />);
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(onAction).toHaveBeenCalledOnce();
    rerender(<Toast open={false} message="Saved" onClose={() => {}} />);
    expect(screen.getByRole("status").textContent).toBe("");
  });
});
