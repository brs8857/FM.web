import { careerSeasonLabel } from "../../engine/season.js";
import TransferCandidate from "./TransferCandidate.jsx";

export default function TransferScreen({ shortlist, assignments, season, lastTransition, onSignBench, onSignXI, onContinue }) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4">
        <div className="text-xs uppercase font-bold text-amber-400" style={{ letterSpacing: "0.2em" }}>Transfer Window</div>
        <h2 className="text-lg font-black text-white">Season {season + 1} · {careerSeasonLabel(season + 1)}</h2>
        <p className="text-sm text-neutral-400 mt-1">Five players have become available. Sign any of them into your bench or straight into the XI in place of someone already there — or skip the window and carry your squad forward as-is.</p>
      </div>

      {lastTransition && lastTransition.relegated.length > 0 && (
        <div className="fmweb-panel rounded-md p-4 mb-4">
          <div className="text-xs uppercase font-bold text-rose-400 mb-1" style={{ letterSpacing: "0.15em" }}>League Changes</div>
          <p className="text-sm text-neutral-300">
            <span className="text-rose-400 font-bold">Relegated to the Championship:</span> {lastTransition.relegated.join(", ")}
          </p>
          <p className="text-sm text-neutral-300 mt-1">
            <span className="text-emerald-400 font-bold">Promoted up to replace them:</span> {lastTransition.promoted.join(", ")}
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
        {shortlist.map((entry, i) => (
          <div key={entry.player.id} style={{ flex: "1 1 260px", minWidth: 0 }}>
            <TransferCandidate entry={entry} index={i} assignments={assignments} onSignBench={onSignBench} onSignXI={onSignXI} />
          </div>
        ))}
      </div>
      <button onClick={onContinue} className="w-full mt-5 px-6 py-3 rounded-md font-bold uppercase tracking-wide text-sm transition fmweb-cta" style={{ background: "#059669", color: "#fff" }}>
        Continue to Season {season + 1} →
      </button>
    </div>
  );
}
