// @vitest-environment node
import { describe, it, expect } from "vitest";
import { t, format } from "./t.js";
import strings from "./strings/en-GB.json";

describe("t", () => {
  it("interpolates named values", () => {
    expect(format("Season {season} · {label}", { season: 3, label: "2028-29" })).toBe("Season 3 · 2028-29");
    expect(format("Hello {name}", {})).toBe("Hello {name}");
  });

  it("selects plural branches with exact matches first and # for the count", () => {
    expect(t("draft.redraws", { count: 2 })).toBe("2 redraws left");
    expect(t("draft.redraws", { count: 1 })).toBe("1 redraw left");
    expect(t("draft.redraws", { count: 0 })).toBe("No redraws left");
    expect(t("season.position", { week: 12, position: "4th", pts: 24 })).toBe("Week 12 · 4th · 24 pts");
    expect(t("season.position", { week: 1, position: "1st", pts: 1 })).toBe("Week 1 · 1st · 1 pt");
  });

  it("nests placeholders inside branches", () => {
    expect(t("draft.eligible", { count: 2, position: "centre-back" })).toBe("2 centre-backs");
    expect(t("draft.eligible", { count: 1, position: "goalkeeper" })).toBe("1 goalkeeper");
    expect(t("draft.eligible", { count: 0, position: "winger" })).toBe("No wingers");
    expect(t("draft.eraCost", { years: 11, delta: "−2" })).toBe("Era spread grows to 11 years: cohesion −2");
  });

  it("supports select and falls back to the key when a string is missing", () => {
    expect(format("{side, select, L {left} R {right} other {either}} foot", { side: "L" })).toBe("left foot");
    expect(format("{side, select, L {left} other {either}} foot", { side: null })).toBe("either foot");
    expect(t("nope.missing")).toBe("nope.missing");
  });

  it("keeps every string free of stray braces", () => {
    for (const [key, template] of Object.entries(strings)) {
      const opens = (template.match(/\{/g) || []).length;
      const closes = (template.match(/\}/g) || []).length;
      expect(opens, key).toBe(closes);
    }
  });
});
