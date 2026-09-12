export default function Slider({ label, value, onChange, leftLabel, rightLabel, tooltip }) {
  return (
    <div className="mb-3 group relative">
      <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
        <span className="uppercase tracking-wide font-bold text-neutral-300">{label}</span>
        <span className="font-mono">{value}</span>
      </div>
      <input type="range" min="0" max="100" value={value} onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-emerald-400 h-1.5 cursor-pointer" />
      <div className="flex items-center justify-between text-xs text-neutral-500 mt-0.5">
        <span>{leftLabel}</span><span>{rightLabel}</span>
      </div>
      {tooltip && <div className="hidden group-hover:block absolute z-20 left-0 top-full mt-1 w-64 bg-neutral-950 border border-neutral-800 rounded-md p-2 text-xs text-neutral-300 shadow-xl">{tooltip}</div>}
    </div>
  );
}
