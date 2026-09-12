import { familiarityLabel } from "../../engine/familiarity.js";
import { tacticalReadout } from "../../engine/readout.js";
import RadarChart from "../ui/RadarChart.jsx";

/* ========================= Tactics Summary (radar + familiarity) =========== */
export default function TacticsSummary({ profile, familiarity, instructions }) {
  const radarData = [
    { label: "Attack", value: profile.attack },
    { label: "Creativity", value: profile.creativity },
    { label: "Buildup", value: profile.buildup },
    { label: "Press", value: profile.press },
    { label: "Defense", value: profile.defSolidity },
    { label: "Physical", value: profile.physical },
  ];
  const readout = tacticalReadout(profile, instructions, familiarity);
  const famColor = familiarity >= 70 ? "bg-emerald-400" : familiarity >= 50 ? "bg-amber-400" : "bg-rose-400";

  return (
    <div className="fmweb-panel rounded-md p-4 shadow-lg shadow-black/30">
      <RadarChart data={radarData} />
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="uppercase tracking-wide font-bold text-neutral-300">Tactical Familiarity</span>
          <span className="font-mono text-neutral-200">{familiarity} · {familiarityLabel(familiarity)}</span>
        </div>
        <div className="h-2 bg-neutral-800 rounded-full overflow-hidden"><div className={`h-full ${famColor}`} style={{ width: `${familiarity}%` }} /></div>
        <p className="text-xs text-neutral-500 mt-1">How well-drilled this exact system is. Sensible, coherent setups raise it; extreme or mismatched ones cost a little consistency in the simulation.</p>
      </div>
      <div className="mt-3 space-y-1.5">
        {readout.map((r, i) => (
          <p key={i} className="text-xs text-neutral-300 bg-neutral-800/60 rounded-md px-2 py-1.5 border border-neutral-800">{r}</p>
        ))}
      </div>
    </div>
  );
}
