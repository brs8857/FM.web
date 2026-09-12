// @vitest-environment node
import { describe, it, expect } from "vitest";
import { clamp, seasonLabel } from "./util.js";
import { FORMATIONS, SLOT_TYPE_LABEL, makeInitialAssignments } from "./formations.js";
import { ROLES, DUTY_INFO, defaultRoleFor, defaultDutyFor } from "./roles.js";
import { DEFAULT_INSTRUCTIONS, STYLE_PRESETS } from "./instructions.js";

describe("util", () => {
  it("clamps and labels seasons", () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(seasonLabel(2026)).toBe("2026-27");
    expect(seasonLabel(1999)).toBe("1999-00");
  });
});

describe("formations and roles", () => {
  it("every formation has 11 slots, exactly one GK, and roles for every slot type", () => {
    for (const [key, formation] of Object.entries(FORMATIONS)) {
      expect(formation.slots, key).toHaveLength(11);
      expect(formation.slots.filter((s) => s.type === "GK"), key).toHaveLength(1);
      for (const slot of formation.slots) {
        expect(ROLES[slot.type], `${key} ${slot.type}`).toBeDefined();
        expect(SLOT_TYPE_LABEL[slot.type]).toBeDefined();
      }
    }
  });

  it("builds empty assignments at template positions", () => {
    const a = makeInitialAssignments("4-3-3");
    expect(a).toHaveLength(11);
    expect(a[0]).toEqual({ slotId: "GK", type: "GK", side: null, player: null, role: null, duty: null, sliderAtt: 50, sliderDef: 50, pos: { x: 50, y: 92 } });
  });

  it("prefers the Support duty when a role allows it", () => {
    expect(defaultRoleFor("ST").key).toBe("POA");
    expect(defaultDutyFor(defaultRoleFor("ST"))).toBe("Attack");
    expect(defaultDutyFor(ROLES.CM[0])).toBe("Support");
    expect(Object.keys(DUTY_INFO)).toEqual(["Defend", "Support", "Attack"]);
  });

  it("has 7 style presets and a neutral default", () => {
    expect(STYLE_PRESETS.map((s) => s.key)).toEqual(["gegenpress", "possession", "counter", "direct", "parkbus", "wingplay", "balanced"]);
    expect(DEFAULT_INSTRUCTIONS.mentality).toBe(50);
  });
});
