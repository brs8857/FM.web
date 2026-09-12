import PitchMarkings from "./PitchMarkings.jsx";

export default function Pitch({ assignments, onSlotClick, activeSlotId, mode, onDragStart, draggingId, dragHint }) {
  const draggable = mode === "tactics";

  return (
    <div className="w-full max-w-sm mx-auto" style={{ filter: "drop-shadow(0 14px 22px rgba(0,0,0,0.55))" }}>
      <div className="relative w-full" style={{ paddingTop: `${(100 / 68) * 100}%` }}>
        <div className="absolute inset-0 rounded-md overflow-hidden border-2 border-emerald-500/40 shadow-2xl shadow-black/50" data-drop-zone="pitch"
          style={{ background: "repeating-linear-gradient(0deg, #14532d, #14532d 12%, #15582f 12%, #15582f 24%)", touchAction: draggable ? "none" : "auto" }}>
          <PitchMarkings />
          {assignments.map((a) => {
          const filled = !!a.player;
          const isActive = activeSlotId === a.slotId;
          const isDragging = draggingId === a.slotId;
          return (
            <button key={a.slotId} onClick={() => onSlotClick(a.slotId)}
              data-slot-id={a.slotId}
              onPointerDown={(e) => { if (draggable && filled) { e.preventDefault(); onDragStart("slot", a.slotId); } }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 group select-none"
              style={{ left: `${a.pos.x}%`, top: `${a.pos.y}%`, zIndex: isDragging ? 30 : 10, touchAction: draggable ? "none" : "auto" }}>
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs font-black border transition
                ${filled ? "bg-neutral-50 border-neutral-300 text-neutral-900 shadow-md" : "bg-neutral-900/60 border-dashed border-neutral-600 text-neutral-400"}
                ${isActive ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-neutral-950" : ""}
                ${isDragging ? "opacity-40 ring-2 ring-sky-400" : ""}
                ${draggable && filled ? "cursor-grab active:cursor-grabbing" : ""}`}>
                {a.type}
              </div>
              <div className="px-1.5 py-0.5 rounded-sm bg-neutral-950/90 border border-neutral-800 text-xs text-neutral-200 whitespace-nowrap truncate pointer-events-none" style={{ maxWidth: "90px" }}>
                {filled ? a.player.name.split(" ").slice(-1)[0] : (mode === "draft" ? "Empty" : a.slotId)}
              </div>
            </button>
          );
        })}
        {dragHint && (
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-xs text-emerald-200/70 bg-neutral-950/70 px-2 py-0.5 rounded-full whitespace-nowrap pointer-events-none">
            Drag anywhere to reposition — drop on a teammate to swap
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
