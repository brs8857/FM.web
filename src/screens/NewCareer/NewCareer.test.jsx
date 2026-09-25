import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Era from "./Era.jsx";
import Formation from "./Formation.jsx";
import RangeSlider from "./RangeSlider.jsx";
import { makeMiniDataset } from "../../../tests/fixtures/miniDataset.js";

describe("RangeSlider", () => {
  it("exposes two sliders with keyboard control that never cross", () => {
    const onChange = vi.fn();
    render(<RangeSlider label="Era" min={1992} max={2024} valueMin={2000} valueMax={2001} onChange={onChange} format={(y) => `${y}-${String(y + 1).slice(2)}`} />);
    const from = screen.getByRole("slider", { name: "From era" });
    const to = screen.getByRole("slider", { name: "To era" });
    expect(from.getAttribute("aria-valuetext")).toBe("2000-01");
    expect(to.getAttribute("aria-valuenow")).toBe("2001");
    fireEvent.keyDown(from, { key: "ArrowRight" });
    expect(onChange).toHaveBeenLastCalledWith(2001, 2001);
    fireEvent.keyDown(from, { key: "ArrowRight", shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith(2001, 2001);
    fireEvent.keyDown(to, { key: "PageUp" });
    expect(onChange).toHaveBeenLastCalledWith(2000, 2006);
    fireEvent.keyDown(to, { key: "Home" });
    expect(onChange).toHaveBeenLastCalledWith(2000, 2000);
    fireEvent.keyDown(from, { key: "End" });
    expect(onChange).toHaveBeenLastCalledWith(2001, 2001);
  });

  it("drags a handle along the track", () => {
    const onChange = vi.fn();
    render(<RangeSlider label="Era" min={0} max={100} valueMin={10} valueMax={90} onChange={onChange} />);
    Element.prototype.getBoundingClientRect = () => ({ left: 0, width: 200, top: 0, height: 6, right: 200, bottom: 6 });
    fireEvent.pointerDown(screen.getByRole("slider", { name: "From era" }), { button: 0, clientX: 20 });
    fireEvent.pointerMove(window, { clientX: 100 });
    expect(onChange).toHaveBeenLastCalledWith(50, 90);
    fireEvent.pointerUp(window, { clientX: 100 });
  });
});

describe("Era", () => {
  it("offers presets and counts the club-seasons in range", () => {
    const onSetEra = vi.fn();
    render(<Era eraMin={2000} eraMax={2001} index={makeMiniDataset().index} onSetEra={onSetEra} />);
    expect(screen.getByText("2000-01 to 2001-02")).toBeTruthy();
    expect(screen.getByText("4 club-seasons")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "The 2010s" }));
    expect(onSetEra).toHaveBeenCalledWith(2010, 2019);
    expect(screen.getByRole("heading", { name: "Choose your era" })).toBeTruthy();
  });
});

describe("Formation", () => {
  it("is a radiogroup of shapes with arrow-key movement", () => {
    const onPick = vi.fn();
    render(<Formation formationKey="4-4-2" onPick={onPick} />);
    const group = screen.getByRole("radiogroup", { name: "Formation" });
    expect(screen.getByRole("radio", { name: "4-4-2" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByRole("radio", { name: "3-5-2" }));
    expect(onPick).toHaveBeenCalledWith("3-5-2");
    fireEvent.keyDown(group, { key: "ArrowRight" });
    expect(onPick).toHaveBeenLastCalledWith("4-2-3-1");
  });
});
