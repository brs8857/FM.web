import { FORMATIONS } from "../../engine/formations.js";
import { seasonLabel } from "../../engine/util.js";
import Pitch from "../pitch/Pitch.jsx";
import EraRangeSlider from "./EraRangeSlider.jsx";

/* ============================ Formation Select screen ======================= */
export default function FormationSelect({ formationKey, onPick, onStart, assignments, eraMin, eraMax, onSetEra }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", width: "100%", alignItems: "flex-start" }}>
      <div style={{ flex: "3 1 380px", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" }}>
        <h2 className="text-lg font-black mb-1 text-white">Choose your era</h2>
        <p className="text-sm text-neutral-400 mb-2">Drag either handle to set which Premier League seasons the draft wheel is allowed to land on — pick a single golden era, or leave it wide open for the full history.</p>
        <div className="fmweb-panel rounded-md p-4 mb-6 shadow-lg shadow-black/30">
          <div className="text-center text-lg font-black text-emerald-400 mb-1">{seasonLabel(eraMin)} — {seasonLabel(eraMax)}</div>
          <EraRangeSlider min={1992} max={2024} valueMin={eraMin} valueMax={eraMax} onChange={onSetEra} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
            {[
              ["Full History", 1992, 2024], ["90s", 1992, 1999], ["2000s", 2000, 2009],
              ["2010s", 2010, 2019], ["Modern Era", 2020, 2024],
            ].map(([label, mn, mx]) => (
              <button key={label} onClick={() => onSetEra(mn, mx)} style={{ minWidth: 0 }}
                className="px-2.5 py-1 rounded-full text-xs font-bold border border-neutral-700 text-neutral-300 hover:border-emerald-400 hover:text-emerald-300 transition">
                {label}
              </button>
            ))}
          </div>
        </div>

        <h2 className="text-lg font-black mb-1 text-white">Choose your formation</h2>
        <p className="text-sm text-neutral-400 mb-4">This sets the 11 slots you'll fill during the draft, and the shape you'll fine-tune on the tactics board afterward.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {Object.keys(FORMATIONS).map((k) => (
            <button key={k} onClick={() => onPick(k)} style={{ flex: "1 1 110px", minWidth: 0 }}
              className={`px-3 py-3 rounded-md border text-center font-black text-sm transition ${formationKey === k ? "bg-emerald-600 text-white border-emerald-600" : "bg-neutral-900 border-neutral-800 text-neutral-200 hover:border-emerald-600"}`}>
              {FORMATIONS[k].label}
            </button>
          ))}
        </div>
        <button onClick={onStart} className="mt-6 px-8 py-3 rounded-md font-bold uppercase tracking-wide text-sm transition fmweb-cta" style={{ background: "#059669", color: "#fff" }}>
          Start the draft →
        </button>
        <div className="mt-8 fmweb-panel rounded-md p-4 text-sm text-neutral-300 space-y-2 shadow-lg shadow-black/30">
          <div className="font-bold text-neutral-200">How the draft works</div>
          <p className="text-neutral-400 text-sm">Spin the wheel to land on a real Premier League club season from your chosen era. That squad's pool only ever shows the exact position you're filling — land on a goalkeeper slot and you'll only see that club's goalkeepers. Draft one, watch him appear on the pitch, then spin for the next slot. Once your XI is complete a bench is added automatically.</p>
        </div>
      </div>
      <div style={{ flex: "1 1 280px", minWidth: 0, maxWidth: "320px", boxSizing: "border-box" }}>
        <Pitch assignments={assignments} activeSlotId={null} mode="draft" onSlotClick={() => {}} onDragStart={() => {}} />
      </div>
    </div>
  );
}
