import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Era from "./Era.jsx";
import Formation from "./Formation.jsx";
import Colours from "./Colours.jsx";
import ClubPicker from "./ClubPicker.jsx";
import RangeSlider from "./RangeSlider.jsx";
import { CLUBS } from "../../content/clubTheme.js";
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

describe("Colours", () => {
  it("is a radiogroup of the pitch theme and every club, sorted by name, with arrow-key movement", () => {
    const onPick = vi.fn();
    render(<Colours club={null} mode="real" onPick={onPick} />);
    expect(screen.getByRole("heading", { name: "Choose your colours" })).toBeTruthy();
    const group = screen.getByRole("radiogroup", { name: "Colours" });
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(CLUBS.length + 1);
    expect(radios[0].getAttribute("aria-checked")).toBe("true");
    expect(radios[0].textContent).toContain("Pitch");
    expect(radios[0].tabIndex).toBe(0);
    expect(radios[1].tabIndex).toBe(-1);
    const names = radios.slice(1).map((r) => r.textContent);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    fireEvent.click(screen.getByRole("radio", { name: "Aston Villa" }));
    expect(onPick).toHaveBeenCalledWith("aston-villa");
    fireEvent.keyDown(group, { key: "ArrowRight" });
    expect(names[0]).toBe("AFC Bournemouth");
    expect(onPick).toHaveBeenLastCalledWith("bournemouth");
    fireEvent.keyDown(group, { key: "End" });
    expect(onPick).toHaveBeenLastCalledWith("wrexham");
  });

  it("selects the stored club, moves back to the pitch theme, and shows edited names on request", () => {
    const onChange = vi.fn();
    render(<ClubPicker value="arsenal" mode="edited" onChange={onChange} />);
    const chosen = screen.getByRole("radio", { checked: true });
    expect(chosen.textContent).toBe("Islington Reds");
    expect(chosen.tabIndex).toBe(0);
    expect(chosen.querySelector("[aria-hidden]").style.getPropertyValue("--swatch-a")).toBe("#EF0107");
    fireEvent.click(screen.getByRole("radio", { name: /Pitch/ }));
    expect(onChange).toHaveBeenCalledWith(null);
    fireEvent.keyDown(screen.getByRole("radiogroup"), { key: "Home" });
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
