import { useRef } from "react";
import { cx } from "../ui/cx.js";
import styles from "./Marker.module.css";

export const DRAG_THRESHOLD_PX = 8;

// A chalk marker with a 44 pt hit area. A press that travels under 8 px is a
// tap (select); beyond it the drag starts and usePitchDrag handles the drop.
// Keyboard behaviour comes from usePitchKeyboard through onKeyDown.
export default function Marker({
  kind, id, code, position, player, x, y, interactive = true, draggable = false,
  active = false, highlighted = false, selected = false, lifted = false, dragging = false,
  onTap, onDragStart, onKeyDown, emptyLabel = "empty", suspended = false,
}) {
  const press = useRef(null);
  const surname = player ? player.name.split(" ").slice(-1)[0] : null;
  const hint = !player ? "" : lifted ? " Selected. Arrow keys move, Enter on another player swaps, Escape cancels." : interactive ? " Press Enter to select." : "";
  const label = player ? `${position}, ${player.name}.${suspended ? " Suspended." : ""}${hint}` : `${position}, ${emptyLabel}.`;
  const style = kind === "slot" ? { left: `${x}%`, top: `${y}%` } : undefined;
  const data = kind === "slot" ? { "data-slot-id": id } : { "data-bench-idx": id };
  const className = cx(
    styles.marker, styles[kind], player ? styles.filled : styles.empty,
    active && styles.active, highlighted && styles.highlighted, selected && styles.selected, lifted && styles.lifted,
    dragging && styles.dragging, draggable && player && styles.draggable, suspended && styles.suspended,
  );
  const inner = (
    <>
      <span className={styles.disc} aria-hidden="true">{code}</span>
      <span className={styles.name} aria-hidden="true">{surname ?? (kind === "slot" ? emptyLabel : "—")}</span>
    </>
  );

  if (!interactive) {
    return <div className={className} style={style} {...data} role="img" aria-label={label}>{inner}</div>;
  }

  const onPointerDown = (event) => {
    if (event.button > 0) return;
    press.current = { x: event.clientX, y: event.clientY, dragged: false };
    if (draggable && player) {
      event.preventDefault();
      try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* synthetic or already captured */ }
    }
  };
  const onPointerMove = (event) => {
    const p = press.current;
    if (!p || p.dragged || !draggable || !player) return;
    if (Math.hypot(event.clientX - p.x, event.clientY - p.y) >= DRAG_THRESHOLD_PX) {
      p.dragged = true;
      onDragStart?.(kind, id);
    }
  };
  const onPointerUp = () => {
    const p = press.current;
    press.current = null;
    if (p && !p.dragged) onTap?.(kind, id);
  };
  const onPointerCancel = () => { press.current = null; };

  return (
    <button type="button" className={className} style={style} {...data} aria-label={label} aria-pressed={lifted || undefined}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel}
      onKeyDown={(event) => onKeyDown?.(event, kind, id)}>
      {inner}
    </button>
  );
}
