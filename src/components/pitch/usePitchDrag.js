import { useEffect, useState } from "react";

export function usePitchDrag({ assignments, dispatch }) {
  const [dragInfo, setDragInfo] = useState(null); // { kind: 'slot'|'bench', id }

  // Global pointer-up coordinator for the pitch/bench drag system. Using
  // pointer events (rather than HTML5 drag-and-drop) means this works with
  // touch on mobile too. On release we hit-test whatever DOM element is under
  // the pointer: land on another player -> swap identities; land on open
  // pitch space -> move that player to the exact drop point; land on the
  // bench -> swap on/off the pitch.
  useEffect(() => {
    if (!dragInfo) return;
    function onUp(e) {
      const point = e.changedTouches ? e.changedTouches[0] : e;
      const el = document.elementFromPoint(point.clientX, point.clientY);
      if (el) {
        const slotEl = el.closest("[data-slot-id]");
        const benchEl = el.closest("[data-bench-idx]");
        const pitchZone = el.closest('[data-drop-zone="pitch"]');
        if (slotEl) {
          const toId = slotEl.getAttribute("data-slot-id");
          if (!(dragInfo.kind === "slot" && dragInfo.id === toId)) {
            dispatch({ type: "SWAP_PLAYERS", fromKind: dragInfo.kind, fromId: dragInfo.id, toKind: "slot", toId });
          }
        } else if (benchEl) {
          const toId = Number(benchEl.getAttribute("data-bench-idx"));
          dispatch({ type: "SWAP_PLAYERS", fromKind: dragInfo.kind, fromId: dragInfo.id, toKind: "bench", toId });
        } else if (pitchZone) {
          const rect = pitchZone.getBoundingClientRect();
          const x = ((point.clientX - rect.left) / rect.width) * 100;
          const y = ((point.clientY - rect.top) / rect.height) * 100;
          if (dragInfo.kind === "slot") {
            dispatch({ type: "MOVE_PLAYER", slotId: dragInfo.id, x, y });
          } else {
            // bench player dropped on open pitch space -> swap into the nearest slot
            let nearest = null, nearestDist = Infinity;
            assignments.forEach((a) => {
              const d = Math.hypot(a.pos.x - x, a.pos.y - y);
              if (d < nearestDist) { nearestDist = d; nearest = a.slotId; }
            });
            if (nearest) dispatch({ type: "SWAP_PLAYERS", fromKind: "bench", fromId: dragInfo.id, toKind: "slot", toId: nearest });
          }
        }
      }
      setDragInfo(null);
    }
    window.addEventListener("pointerup", onUp);
    window.addEventListener("touchend", onUp);
    return () => { window.removeEventListener("pointerup", onUp); window.removeEventListener("touchend", onUp); };
  }, [dragInfo, assignments, dispatch]);

  return { dragInfo, startDrag: (kind, id) => setDragInfo({ kind, id }) };
}
