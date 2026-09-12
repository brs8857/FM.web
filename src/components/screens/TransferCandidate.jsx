import { useState } from "react";
import { STAT_KEYS, STAT_LABELS } from "../../engine/players.js";
import StatPip from "../ui/StatPip.jsx";

/* ============================== Transfer Window ============================== */
export default function TransferCandidate({ entry, index, assignments, onSignBench, onSignXI }) {
  const { player, signed } = entry;
  const [picking, setPicking] = useState(false);
  const matchingSlots = assignments.filter((a) => a.type === player.slot);
  const slotChoices = matchingSlots.length > 0 ? matchingSlots : assignments;

  return (
    <div className={`fmweb-panel rounded-md p-3 ${signed ? "opacity-50" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-bold text-neutral-100 text-sm truncate">{player.name}</div>
          <div className="text-xs text-neutral-500 uppercase tracking-wide">{player.slot}{player.side ? ` · ${player.side}` : ""} · {player.nat} · Age {player.age || "—"}</div>
        </div>
        <div className="flex items-center justify-center rounded-full border-2 border-dashed border-neutral-600 text-neutral-500 w-7 h-7 text-xs font-black">?</div>
      </div>
      <div className="grid grid-cols-3 gap-1 mt-2">
        {STAT_KEYS.map((k) => <StatPip key={k} label={STAT_LABELS[k]} value={player.stats[k]} />)}
      </div>
      {!signed ? (
        <div className="mt-3">
          {!picking ? (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={() => onSignBench(index)} style={{ flex: "1 1 0%" }} className="px-2 py-1.5 rounded-md text-xs font-bold border border-neutral-700 text-neutral-200 hover:border-emerald-500 transition">Sign to Bench</button>
              <button onClick={() => setPicking(true)} style={{ flex: "1 1 0%", background: "#059669", color: "#fff" }} className="px-2 py-1.5 rounded-md text-xs font-bold transition fmweb-cta">Sign to XI</button>
            </div>
          ) : (
            <div>
              <div className="text-xs text-neutral-400 mb-1">Replace which player?</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {slotChoices.map((a) => (
                  <button key={a.slotId} onClick={() => onSignXI(index, a.slotId)} style={{ minWidth: 0 }}
                    className="px-2 py-1 rounded-md text-xs font-bold border border-neutral-700 text-neutral-200 hover:border-emerald-500 transition">
                    {a.player ? a.player.name.split(" ").slice(-1)[0] : a.type} <span className="text-neutral-500">({a.type})</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setPicking(false)} className="mt-2 text-xs text-neutral-500 hover:text-neutral-300 transition">Cancel</button>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-2 text-xs font-bold text-emerald-500 uppercase tracking-wide">Signed</div>
      )}
    </div>
  );
}
