import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Callout from "./Callout.jsx";

describe("Callout", () => {
  it("is a labelled note with a dismiss control", () => {
    const onDismiss = vi.fn();
    render(<Callout title="Coach's note" onDismiss={onDismiss}>Tap a row to see the player sheet.</Callout>);
    expect(screen.getByRole("note", { name: "Coach's note" }).textContent).toContain("Tap a row");
    fireEvent.click(screen.getByRole("button", { name: "Dismiss note" }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
