import { useEffect, useMemo, useRef, useState } from "react";
import { usePitchDrag } from "./usePitchDrag.js";
import { usePitchKeyboard } from "./usePitchKeyboard.js";
import PitchLines from "./PitchLines.jsx";
import Marker from "./Marker.jsx";
import BenchRail from "./BenchRail.jsx";
import { POSITION_LABEL } from "../content/labels.js";
import { cx } from "../ui/cx.js";
import styles from "./Chalkboard.module.css";

const noop = () => {};

// The chalkboard. Modes: "draft" (static, the active slot pulses), "view"
// (markers open sheets, no moving) and "board" (drag, keyboard, swap).
// `highlightSlots` marks the eligible slots in the window's Replace flow;
// `suspended` (a Set of player ids) crosses out banned starters.
export default function Chalkboard({
  assignments, bench = [], mode = "view", activeSlotId = null, highlightSlots = [], selectedId = null,
  onSelect, onOpenSheet, dispatch = noop, announce, compact = false, className, suspended,
}) {
  const interactive = mode !== "draft";
  const draggable = mode === "board";
  const highlight = useMemo(() => new Set(highlightSlots), [highlightSlots]);
  const { dragInfo, startDrag } = usePitchDrag({ assignments, dispatch });
  const keys = usePitchKeyboard({ assignments, bench, dispatch, onOpenSheet, announce });
  const pitchRef = useRef(null);
  const [pointer, setPointer] = useState(null);

  useEffect(() => {
    if (!dragInfo) { setPointer(null); return undefined; }
    const onMove = (event) => {
      const rect = pitchRef.current?.getBoundingClientRect();
      if (!rect || !rect.width) return;
      setPointer({ x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100 });
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [dragInfo]);

  const origin = dragInfo?.kind === "slot" ? assignments.find((a) => a.slotId === dragInfo.id)?.pos : null;
  const draggedCode = dragInfo ? (dragInfo.kind === "slot" ? assignments.find((a) => a.slotId === dragInfo.id)?.type : bench[dragInfo.id]?.player?.slot) : null;

  return (
    <div className={cx(styles.board, compact && styles.compact, mode === "draft" && styles.draft, className)}>
      <div ref={pitchRef} data-drop-zone="pitch" role="group" aria-label="Chalkboard" className={styles.pitch}
        style={{ touchAction: draggable ? "none" : undefined }}>
        <PitchLines />
        {origin && pointer && (
          <svg className={styles.trail} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <line x1={origin.x} y1={origin.y} x2={pointer.x} y2={pointer.y} />
          </svg>
        )}
        {assignments.map((a) => (
          <Marker key={a.slotId} kind="slot" id={a.slotId} code={a.type} position={POSITION_LABEL[a.type] ?? a.type} player={a.player}
            x={a.pos.x} y={a.pos.y} interactive={interactive} draggable={draggable}
            active={a.slotId === activeSlotId} highlighted={highlight.has(a.slotId)} selected={a.slotId === selectedId}
            lifted={keys.selected?.kind === "slot" && keys.selected.id === a.slotId}
            dragging={dragInfo?.kind === "slot" && dragInfo.id === a.slotId}
            onTap={onSelect} onDragStart={startDrag} onKeyDown={keys.onKeyDown}
            suspended={Boolean(a.player && suspended?.has(a.player.id))}
            emptyLabel={mode === "draft" ? "empty" : a.slotId} />
        ))}
        {dragInfo && pointer && (
          <span className={styles.ghost} style={{ left: `${pointer.x}%`, top: `${pointer.y}%` }} aria-hidden="true">{draggedCode}</span>
        )}
      </div>
      {bench.length > 0 && (
        <BenchRail bench={bench} interactive={interactive} draggable={draggable} lifted={keys.selected}
          draggingIdx={dragInfo?.kind === "bench" ? dragInfo.id : null}
          onTap={onSelect} onDragStart={startDrag} onKeyDown={keys.onKeyDown} />
      )}
    </div>
  );
}
