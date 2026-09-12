/* ================================ Bench strip ================================ */
export default function BenchStrip({ bench, onDragStart, draggingId, draggable }) {
  return (
    <div className="fmweb-panel rounded-md p-3" data-drop-zone="bench">
      <div className="text-xs uppercase tracking-wide text-neutral-400 font-bold mb-2">Bench {draggable && <span className="normal-case font-normal text-neutral-500">— drag on/off the pitch</span>}</div>
      <div className="space-y-1.5">
        {bench.map((b, i) => (
          <div key={i}
            data-bench-idx={i}
            onPointerDown={(e) => { if (draggable && b.player) { e.preventDefault(); onDragStart("bench", i); } }}
            className={`text-xs flex items-center justify-between rounded px-2 py-1.5 border transition select-none
              ${b.player ? "bg-neutral-800/60 border-neutral-800" : "bg-neutral-950/40 border-dashed border-neutral-800 text-neutral-500"}
              ${draggingId === i ? "opacity-40 ring-2 ring-sky-300" : ""} ${draggable && b.player ? "cursor-grab active:cursor-grabbing" : ""}`}
            style={{ touchAction: draggable ? "none" : "auto" }}>
            <span className="truncate pointer-events-none">{b.player ? b.player.name : "Empty"}</span>
            {b.player && <span className="text-neutral-400 shrink-0 pointer-events-none">{b.player.slot}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
