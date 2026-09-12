import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StatPip from "./StatPip.jsx";
import OvBadge from "./OvBadge.jsx";
import PlayerMiniCard from "./PlayerMiniCard.jsx";
import RadarChart from "./RadarChart.jsx";
import Slider from "./Slider.jsx";

const player = { id: "p", name: "Tony Adams", slot: "CB", side: null, nat: "England", age: 26, ov: 91 };

describe("ui building blocks", () => {
  it("StatPip shows its label and value", () => {
    render(<StatPip label="Pace" value={88} />);
    expect(screen.getByText("Pace")).toBeTruthy();
    expect(screen.getByText("88")).toBeTruthy();
  });

  it("OvBadge shows the rating", () => {
    render(<OvBadge ov={91} />);
    expect(screen.getByText("91")).toBeTruthy();
  });

  it("PlayerMiniCard can hide the rating", () => {
    const onClick = vi.fn();
    render(<PlayerMiniCard player={player} onClick={onClick} hideRating />);
    expect(screen.getByText("?")).toBeTruthy();
    expect(screen.queryByText("91")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Tony Adams/ }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("RadarChart labels all six axes", () => {
    const labels = ["Attack", "Creativity", "Buildup", "Press", "Defense", "Physical"];
    render(<RadarChart data={labels.map((label, i) => ({ label, value: 50 + i }))} />);
    for (const label of labels) expect(screen.getByText(label)).toBeTruthy();
  });

  it("Slider reports numbers", () => {
    const onChange = vi.fn();
    render(<Slider label="Tempo" value={50} onChange={onChange} leftLabel="Slow" rightLabel="Fast" />);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "70" } });
    expect(onChange).toHaveBeenCalledWith(70);
  });
});
