import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import DraftScreen from "./DraftScreen.jsx";
import { makeInitialAssignments } from "../../engine/formations.js";
import { makeMiniDataset } from "../../../tests/fixtures/miniDataset.js";
import { createSquadLookup } from "../../engine/players.js";

describe("DraftScreen relaxed pool", () => {
  it("explains the fallback and marks off-position players", () => {
    const dataset = makeMiniDataset();
    const pool = createSquadLookup(dataset)("2005", "3").slice(0, 3);
    render(
      <DraftScreen assignments={makeInitialAssignments("4-1-4-1")} bench={[]} wheel={{ spinning: false, landed: { label: "Gamma Town 2005-06" } }}
        pool={pool} poolRelaxed draftTargetSlotId="DM" draftTargetLabel="Defensive Mid" draftComplete={false}
        eraMin={2005} eraMax={2005} eraIndex={dataset.index} onSpin={vi.fn()} onDoneSpin={vi.fn()} onPick={vi.fn()} onGotoTactics={vi.fn()} />
    );
    expect(screen.getByText("No Defensive Mids in Gamma Town 2005-06. Showing the whole squad.")).toBeTruthy();
    expect(screen.queryByText(/only Defensive Mids/)).toBeNull();
    expect(screen.getAllByTitle("Not a Defensive Mid")).toHaveLength(3);
  });
});
