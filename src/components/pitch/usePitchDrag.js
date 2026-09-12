import { useCallback, useEffect, useRef, useState } from "react";

// Global pointer-up coordinator for the pitch/bench drag system. Pointer events
// cover mouse, pen and touch, so no separate touch listeners are needed (having
// both ran every touch drop twice — bug #7). On release we hit-test whatever
// DOM element is under the pointer: land on another player -> swap; land on
// open pitch space -> move there; land on the bench -> swap on/off the pitch.
export function usePitchDrag({ assignments, dispatch }) {
  const [dragInfo, setDragInfo] = useState(null); // { kind: 'slot'|'bench', id }
  const handled = useRef(false);

  const startDrag = useCallback((kind, id) => {
    handled.current = false;
    setDragInfo({ kind, id });
  }, []);

  useEffect(() => {
    if (!dragInfo) return undefined;

    function onUp(e) {
      if (handled.current) return;
      handled.current = true;
      const el = document.elementFromPoint(e.clientX, e.clientY);
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
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          if (dragInfo.kind === "slot") {
            dispatch({ type: "MOVE_PLAYER", slotId: dragInfo.id, x, y });
          } else {
            // bench player dropped on open pitch -> swap into the nearest slot
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

    function onCancel() {
      handled.current = true;
      setDragInfo(null);
    }

    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    return () => {
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
  }, [dragInfo, assignments, dispatch]);

  return { dragInfo, startDrag };
}
