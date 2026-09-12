// @vitest-environment node
import { describe, it, expect } from "vitest";
import xis from "../golden/xis.json";
import profiles from "../golden/profiles.json";
import { STYLE_PRESETS } from "../../src/engine/instructions.js";
import { computeTeamProfile } from "../../src/engine/tactics.js";
import { computeFamiliarity } from "../../src/engine/familiarity.js";
import { tacticalReadout } from "../../src/engine/readout.js";

const plain = (value) => JSON.parse(JSON.stringify(value));

describe("golden: familiarity, team profile and readout match v1 exactly", () => {
  it("covers 20 XIs × 7 styles", () => {
    expect(profiles).toHaveLength(140);
  });

  it.each(profiles.map((entry, i) => [i, entry]))("entry %i", (_i, entry) => {
    const xi = xis[entry.xiIndex];
    const style = STYLE_PRESETS.find((s) => s.key === entry.style);
    const familiarity = computeFamiliarity(xi.assignments, style.instructions, xi.formationKey);
    expect(familiarity).toBe(entry.familiarity);
    const profile = computeTeamProfile(xi.assignments, style.instructions, familiarity);
    expect(plain(profile)).toEqual(entry.profile);
    expect(tacticalReadout(profile, style.instructions, familiarity)).toEqual(entry.readout);
  });
});
