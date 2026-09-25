import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Dial from "./Dial.jsx";
import { TermsProvider } from "./Term.jsx";

describe("Dial", () => {
  it("is a labelled slider with a spoken value and 5-unit steppers", () => {
    const onChange = vi.fn();
    render(<Dial label="Mentality" value={50} valueLabel="Even" onChange={onChange} leftLabel="Contain" rightLabel="All-out" />);
    const slider = screen.getByRole("slider", { name: "Mentality" });
    expect(slider.getAttribute("aria-valuetext")).toBe("50, Even");
    fireEvent.change(slider, { target: { value: "63" } });
    expect(onChange).toHaveBeenLastCalledWith(63);
    fireEvent.click(screen.getByRole("button", { name: "Lower Mentality" }));
    expect(onChange).toHaveBeenLastCalledWith(45);
    fireEvent.click(screen.getByRole("button", { name: "Raise Mentality" }));
    expect(onChange).toHaveBeenLastCalledWith(55);
  });

  it("clamps at the ends and disables the stepper that can't move", () => {
    const onChange = vi.fn();
    render(<Dial label="Tempo" value={98} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Raise Tempo" }));
    expect(onChange).toHaveBeenLastCalledWith(100);
    const { rerender } = render(<Dial label="Width" value={100} onChange={onChange} />);
    expect(screen.getByRole("button", { name: "Raise Width" }).disabled).toBe(true);
    rerender(<Dial label="Width" value={0} onChange={onChange} />);
    expect(screen.getByRole("button", { name: "Lower Width" }).disabled).toBe(true);
  });

  it("opens the term sheet from the info button", () => {
    render(
      <TermsProvider terms={{ tempo: { title: "Tempo", body: "How quickly the ball moves." } }}>
        <Dial label="Tempo" value={40} onChange={() => {}} term="tempo" />
      </TermsProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "About Tempo" }));
    expect(screen.getByRole("dialog", { name: "Tempo" }).textContent).toContain("How quickly the ball moves.");
  });
});
