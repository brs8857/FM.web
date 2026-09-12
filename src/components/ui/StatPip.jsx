import { clamp } from "../../engine/util.js";

export default function StatPip({ label, value }) {
  const pct = clamp(value, 0, 99);
  const color = pct >= 85 ? "bg-emerald-400" : pct >= 70 ? "bg-lime-400" : pct >= 55 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-16 text-neutral-400 uppercase tracking-wide">{label}</span>
      <div className="flex-1 h-1.5 bg-neutral-700/70 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 text-right font-mono text-neutral-200">{value}</span>
    </div>
  );
}
