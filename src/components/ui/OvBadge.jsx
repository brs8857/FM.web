export default function OvBadge({ ov, size = "md" }) {
  const color = ov >= 85 ? "text-amber-300 border-amber-400/60" : ov >= 75 ? "text-emerald-300 border-emerald-400/50" : ov >= 65 ? "text-sky-300 border-sky-400/50" : "text-neutral-300 border-emerald-600/50";
  const sz = size === "lg" ? "w-12 h-12 text-lg" : size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";
  return <div className={`flex items-center justify-center rounded-full border-2 ${color} ${sz} font-black bg-neutral-900/70`}>{ov}</div>;
}
