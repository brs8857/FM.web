import { useEffect, useMemo, useState } from "react";
import { careerSeasonLabel } from "../../engine/season.js";
import OvBadge from "../ui/OvBadge.jsx";

/* ============================== Ratings Reveal ================================ */
export default function RatingsRevealScreen({ assignments, season, onKickoff, instant }) {
  const starters = useMemo(() => assignments.filter((a) => a.player).map((a) => a.player).sort((a, b) => a.ov - b.ov), [assignments]);
  const [revealed, setRevealed] = useState(instant ? starters.length : 0);

  useEffect(() => {
    if (revealed >= starters.length) return;
    const t = setTimeout(() => setRevealed((r) => r + 1), 240);
    return () => clearTimeout(t);
  }, [revealed, starters.length]);

  const done = revealed >= starters.length;
  const avgOv = Math.round(starters.reduce((s, p) => s + p.ov, 0) / Math.max(1, starters.length));

  return (
    <div className="max-w-md mx-auto text-center">
      <div className="text-xs uppercase font-bold text-amber-400" style={{ letterSpacing: "0.2em" }}>Season {season} · {careerSeasonLabel(season)}</div>
      <h2 className="text-lg font-black text-white mb-1">Squad Ratings Revealed</h2>
      <p className="text-xs text-neutral-500 mb-4">Kept hidden through the draft and tactics board — here's what you actually assembled.</p>
      <div className="space-y-1.5">
        {starters.map((p, i) => {
          const shown = i < revealed;
          return (
            <div key={p.id} className="fmweb-panel rounded-md px-3 py-2 flex items-center justify-between"
              style={{
                opacity: shown ? 1 : 0,
                transform: shown ? "translateY(0) scale(1)" : "translateY(8px) scale(0.96)",
                transition: "opacity 0.35s ease, transform 0.35s ease",
              }}>
              <span className="text-sm font-bold text-neutral-100 truncate">{p.name}</span>
              {shown && <OvBadge ov={p.ov} size="sm" />}
            </div>
          );
        })}
      </div>
      {done && (
        <div className="fmweb-panel rounded-md p-4 mt-4" style={{ animation: "fmweb-fade-in 0.4s ease-out" }}>
          <div className="text-xs uppercase text-neutral-500 font-bold" style={{ letterSpacing: "0.15em" }}>Squad Average</div>
          <div className="text-3xl font-black text-emerald-400">{avgOv}</div>
        </div>
      )}
      {done && (
        <button onClick={onKickoff} className="w-full mt-4 px-6 py-3 rounded-md font-bold uppercase tracking-wide text-sm transition fmweb-cta" style={{ background: "#059669", color: "#fff" }}>
          Kick Off Season {season} →
        </button>
      )}
    </div>
  );
}
