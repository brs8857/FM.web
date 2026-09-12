import { useEffect, useRef, useState } from "react";
import { clamp, seasonLabel } from "../../engine/util.js";

/* ============================ Era range slider ================================ */
/* A true dual-handle range slider (two independently draggable thumbs, pointer
   -based so it works on touch too) letting the player pick exactly which
   Premier League seasons the draft wheel is allowed to land on. */
export default function EraRangeSlider({ min, max, valueMin, valueMax, onChange }) {
  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(null); // 'min' | 'max' | null

  useEffect(() => {
    if (!dragging || !trackRef.current) return;
    function yearFromEvent(e) {
      const point = e.touches ? e.touches[0] : e;
      const rect = trackRef.current.getBoundingClientRect();
      const pct = clamp((point.clientX - rect.left) / rect.width, 0, 1);
      return Math.round(min + pct * (max - min));
    }
    function onMove(e) {
      const year = yearFromEvent(e);
      if (dragging === "min") onChange(Math.min(year, valueMax), valueMax);
      else onChange(valueMin, Math.max(year, valueMin));
    }
    function onUp() { setDragging(null); }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragging, valueMin, valueMax, min, max, onChange]);

  const pctMin = ((valueMin - min) / (max - min)) * 100;
  const pctMax = ((valueMax - min) / (max - min)) * 100;
  const Handle = (which, pct) => (
    <button
      onPointerDown={(e) => { e.preventDefault(); setDragging(which); }}
      onTouchStart={(e) => { e.preventDefault(); setDragging(which); }}
      className={`absolute top-1/2 w-6 h-6 rounded-full bg-white border-4 border-emerald-500 -translate-x-1/2 -translate-y-1/2 shadow cursor-grab active:cursor-grabbing ${dragging === which ? "scale-110 ring-2 ring-emerald-300" : ""}`}
      style={{ left: `${pct}%`, touchAction: "none" }}
    />
  );

  return (
    <div className="pt-2 pb-1">
      <div ref={trackRef} className="relative h-2 bg-neutral-700 rounded-full" style={{ touchAction: "none" }}>
        <div className="absolute h-2 bg-emerald-400 rounded-full" style={{ left: `${pctMin}%`, width: `${pctMax - pctMin}%` }} />
        {Handle("min", pctMin)}
        {Handle("max", pctMax)}
      </div>
      <div className="flex justify-between text-xs text-neutral-500 mt-3">
        <span>{seasonLabel(min)}</span>
        <span>{seasonLabel(max)}</span>
      </div>
    </div>
  );
}
