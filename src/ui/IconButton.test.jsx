import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import IconButton from "./IconButton.jsx";
import { CloseIcon } from "./icons.jsx";

describe("IconButton", () => {
  it("names itself from the label and hides the icon from assistive tech", () => {
    const onClick = vi.fn();
    render(<IconButton label="Close" onClick={onClick}><CloseIcon /></IconButton>);
    const button = screen.getByRole("button", { name: "Close" });
    expect(button.querySelector("svg").getAttribute("aria-hidden")).toBe("true");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });
});
