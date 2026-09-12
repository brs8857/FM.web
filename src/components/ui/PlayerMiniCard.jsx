import OvBadge from "./OvBadge.jsx";

export default function PlayerMiniCard({ player, onClick, selected, dim, hideRating, positionMismatch }) {
  return (
    <button onClick={onClick} className={`text-left w-full rounded-md border px-3 py-2 transition-all ${selected ? "border-emerald-400 bg-emerald-400/10 ring-1 ring-emerald-400/40" : "border-neutral-800 bg-neutral-800/60 hover:border-emerald-600 hover:bg-neutral-800"} ${dim ? "opacity-40" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-bold text-neutral-100 text-sm truncate">{player.name}</div>
          <div className="text-xs text-neutral-400 uppercase tracking-wide"><span className={positionMismatch ? "text-amber-400 font-bold" : undefined} title={positionMismatch?.title}>{player.slot}</span>{player.side ? ` · ${player.side}` : ""} · {player.nat} · Age {player.age || "—"}</div>
        </div>
        {hideRating
          ? <div className="flex items-center justify-center rounded-full border-2 border-dashed border-neutral-600 text-neutral-500 w-7 h-7 text-xs font-black">?</div>
          : <OvBadge ov={player.ov} size="sm" />}
      </div>
    </button>
  );
}
