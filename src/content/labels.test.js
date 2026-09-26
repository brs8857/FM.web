// @vitest-environment node
import { describe, it, expect } from "vitest";
import { ROLES, DUTY_INFO } from "../engine/roles.js";
import { STYLE_PRESETS, DEFAULT_INSTRUCTIONS } from "../engine/instructions.js";
import { seasonTier } from "../engine/season.js";
import {
  POSITION_LABEL, BRIEF_LABEL, DISCIPLINE_LABEL, TIER_LABEL, TIER_STANDFIRST, tierLabel, roleLabel, briefLabel,
  cohesionLabel, mentalityLabel, identityLabel, STRENGTH_LABEL, DIAL_LABEL, DIAL_ENDS,
} from "./labels.js";

const BANNED = /football manager|premier league|\bFM\b/i;

describe("vocabulary (spec 04 Appendix A)", () => {
  it("renames the jobs, keeping every key and weight", () => {
    const labels = Object.fromEntries(Object.values(ROLES).flat().map((r) => [r.key, r.label]));
    expect(labels).toMatchObject({
      GK: "Line keeper", SK: "Sweeper keeper", NCB: "Blocker", STP: "Stopper", CVR: "Cover", BPD: "Passing centre-back",
      FB: "Full-back", IFB: "Inverted full-back", OFB: "Overlapping full-back", WB: "Wing-back", CWB: "All-action wing-back",
      ANC: "Holding midfielder", DLP: "Deep playmaker", BWM: "Ball-winner", RPM: "Roamer",
      CM: "Central midfielder", B2B: "Box-to-box", MEZ: "Mezzala", APM: "Creator",
      AMD: "Attacking midfielder", APM2: "Number 10", SS: "Second striker", ENG: "Enganche",
      WNG: "Winger", IW: "Inverted winger", WP: "Wide creator", TW: "Out-and-out winger",
      POA: "Poacher", TM: "Target man", F9: "False nine", PF: "Press-first striker", DLF: "Link forward", CF: "All-round forward",
    });
    expect(Object.keys(labels)).toHaveLength(33);
    expect(roleLabel("CB", "NCB")).toBe("Blocker");
    expect(roleLabel("CB", "nope")).toBe("nope");
  });

  it("renames the briefs but not the duty keys", () => {
    expect(Object.keys(DUTY_INFO)).toEqual(["Defend", "Support", "Attack"]);
    expect(BRIEF_LABEL).toEqual({ Defend: "Hold", Support: "Link", Attack: "Push" });
    expect(briefLabel("Attack")).toBe("Push");
    expect(DUTY_INFO.Attack).toMatchObject({ attMul: 1.32, defMul: 0.70 });
  });

  it("uses five mentality words and four cohesion words at the spec's thresholds", () => {
    expect([0, 20, 21, 42, 43, 58, 59, 80, 81, 100].map(mentalityLabel))
      .toEqual(["Contain", "Contain", "Careful", "Careful", "Even", "Even", "Front-foot", "Front-foot", "All-out", "All-out"]);
    expect([12, 41, 42, 59, 60, 79, 80, 96].map(cohesionLabel))
      .toEqual(["Strangers", "Strangers", "Rough", "Rough", "Settled", "Settled", "Clicking", "Clicking"]);
  });

  it("relabels the neutral preset as a blank slate and the shape as discipline", () => {
    expect(STYLE_PRESETS.find((s) => s.key === "balanced").label).toBe("Blank slate");
    expect(DISCIPLINE_LABEL).toEqual({ structured: "Rigid", fluid: "Loose" });
  });

  it("covers every tier the engine can produce", () => {
    const tiers = [
      { w: 38, l: 0, pts: 114, position: 1 }, { w: 30, l: 0, pts: 98, position: 1 }, { w: 33, l: 3, pts: 101, position: 1 },
      { w: 28, l: 5, pts: 89, position: 1 }, { w: 22, l: 8, pts: 74, position: 5 }, { w: 20, l: 10, pts: 68, position: 7 },
      { w: 18, l: 12, pts: 62, position: 8 }, { w: 12, l: 14, pts: 48, position: 12 }, { w: 6, l: 24, pts: 26, position: 19 },
    ].map(seasonTier);
    expect(new Set(tiers.map((t) => t.name)).size).toBe(9);
    for (const tier of tiers) {
      expect(TIER_LABEL, tier.name).toHaveProperty(tier.name);
      expect(TIER_STANDFIRST, tier.name).toHaveProperty(tier.name);
      const shown = tierLabel(tier);
      expect(shown.name).not.toMatch(BANNED);
      expect(shown.sub).not.toMatch(BANNED);
      expect(shown.color).toBe(tier.color);
    }
    expect(tierLabel(seasonTier({ w: 22, l: 8, pts: 74, position: 5 })).name).toBe("Top five");
    expect(tierLabel(seasonTier({ w: 6, l: 24, pts: 26, position: 19 })).name).toBe("Relegated");
  });

  it("names the identity line", () => {
    expect(identityLabel(STYLE_PRESETS.find((p) => p.key === "gegenpress").instructions)).toBe("Gegenpress");
    expect(identityLabel(DEFAULT_INSTRUCTIONS)).toBe("No clear plan");
    expect(identityLabel({ ...DEFAULT_INSTRUCTIONS, tempo: 90, press: 10, width: 95 })).toBe("Bespoke");
  });

  it("labels every position, strength and dial", () => {
    expect(Object.keys(POSITION_LABEL)).toEqual(Object.keys(ROLES));
    expect(Object.keys(STRENGTH_LABEL)).toHaveLength(6);
    for (const key of Object.keys(DIAL_LABEL)) {
      expect(DEFAULT_INSTRUCTIONS, key).toHaveProperty(key);
      expect(DIAL_ENDS[key], key).toHaveLength(2);
    }
  });
});
