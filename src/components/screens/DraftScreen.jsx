import { SLOT_TYPE_LABEL } from "../../engine/formations.js";
import { seasonLabel } from "../../engine/util.js";
import Pitch from "../pitch/Pitch.jsx";
import PlayerMiniCard from "../ui/PlayerMiniCard.jsx";
import WheelSpinner from "./WheelSpinner.jsx";

/* ================================ Draft screen =============================== */
export default function DraftScreen({ formationKey, assignments, bench, wheel, pool, draftTargetSlotId, draftTargetLabel, draftComplete, eraMin, eraMax, eraIndex, onSpin, onDoneSpin, onPick, onGotoTactics }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", width: "100%", alignItems: "flex-start" }}>
      <div style={{ flex: "1 1 260px", minWidth: 0, maxWidth: "320px", boxSizing: "border-box" }} className="space-y-3">
        <Pitch assignments={assignments} activeSlotId={draftComplete ? null : draftTargetSlotId} mode="draft" onSlotClick={() => {}} onDragStart={() => {}} />
        <p className="text-xs text-neutral-500 text-center">The pitch fills in live as you draft — the pulsing slot is the one you're filling next.</p>
        <div className="fmweb-panel rounded-md px-3 py-2 text-center shadow-lg shadow-black/20">
          <div className="text-xs uppercase tracking-wide text-neutral-500 font-bold">Drafting Era</div>
          <div className="text-sm font-black text-emerald-400">{seasonLabel(eraMin)} – {seasonLabel(eraMax)}</div>
        </div>
        {draftComplete && bench.length > 0 && (
          <div className="fmweb-panel rounded-md p-3 shadow-lg shadow-black/20">
            <div className="text-xs uppercase tracking-wide text-neutral-400 font-bold mb-2">Bench (auto-added, {bench.length})</div>
            <div className="space-y-1">
              {bench.map((b, i) => (
                <div key={i} className="text-xs flex items-center justify-between bg-neutral-800/60 rounded px-2 py-1">
                  <span className="truncate">{b.player.name}</span>
                  <span className="text-neutral-400">{b.player.slot}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-neutral-500 mt-2">Pulled from the same squads you drafted from — you can still drag bench players into the XI on the tactics board.</p>
          </div>
        )}
      </div>

      <div style={{ flex: "3 1 380px", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" }}>
        {!draftComplete ? (
          <div className="mb-6">
            <div className="text-xs uppercase tracking-wide text-neutral-400 font-bold mb-2">Now drafting: <span className="text-emerald-400">{draftTargetLabel}</span></div>
            <WheelSpinner spinning={wheel.spinning} landed={wheel.landed} onSpin={onSpin} onDone={onDoneSpin} targetLabel={draftTargetLabel} pool={eraIndex} />
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", justifyContent: "space-between" }}
            className="mb-6 fmweb-panel rounded-md p-4">
            <div style={{ minWidth: 0 }}>
              <div className="font-black text-neutral-100">Starting XI complete</div>
              <div className="text-xs text-neutral-400">A bench has been added automatically. Head to the tactics board when you're ready.</div>
            </div>
            <button onClick={onGotoTactics} style={{ flexShrink: 0, background: "#059669", color: "#fff" }} className="px-5 py-2.5 rounded-md font-bold uppercase tracking-wide text-xs transition h-fit fmweb-cta">
              Go to Tactics →
            </button>
          </div>
        )}

        {!draftComplete && wheel.landed && pool.length > 0 && (
          <div>
            <div className="text-xs uppercase tracking-wide text-neutral-400 font-bold mb-2">
              Squad pool — only {SLOT_TYPE_LABEL[assignments.find((a) => a.slotId === draftTargetSlotId)?.type] || ""}s from this club season — pick one
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {pool.map((p) => (
                <div key={p.id} style={{ flex: "1 1 220px", minWidth: 0 }}><PlayerMiniCard player={p} onClick={() => onPick(p)} hideRating /></div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
