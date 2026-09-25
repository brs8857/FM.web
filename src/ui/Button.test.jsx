import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Button from "./Button.jsx";

describe("Button", () => {
  it("is a real button that defaults to type=button", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Kick off</Button>);
    const button = screen.getByRole("button", { name: "Kick off" });
    expect(button.getAttribute("type")).toBe("button");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("honours disabled and passes ARIA through", () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick} aria-describedby="why">Draw</Button>);
    const button = screen.getByRole("button", { name: "Draw" });
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-describedby")).toBe("why");
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
