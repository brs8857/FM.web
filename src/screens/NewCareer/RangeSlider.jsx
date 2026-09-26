import { useEffect, useId, useRef, useState } from "react";
import { clamp } from "../../engine/util.js";
import { cx } from "../../ui/cx.js";
import styles from "./RangeSlider.module.css";

const STEP_KEYS = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -5, PageUp: 5 };

export default function RangeSlider({ label, min, max, valueMin, valueMax, onChange, format = String }) {
  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const id = useId();

  useEffect(() => {
    if (!dragging) return undefined;
    const valueAt = (clientX) => {
      const rect = trackRef.current.getBoundingClientRect();
      return Math.round(min + clamp((clientX - rect.left) / rect.width, 0, 1) * (max - min));
    };
    const onMove = (e) => {
      const v = valueAt(e.clientX);
      if (dragging === "min") onChange(Math.min(v, valueMax), valueMax);
      else onChange(valueMin, Math.max(v, valueMin));
    };
    const onUp = () => setDragging(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, valueMin, valueMax, min, max, onChange]);

  const pct = (v) => ((v - min) / (max - min)) * 100;
  const onKeyDown = (which) => (event) => {
    let next;
    if (event.key in STEP_KEYS) next = (which === "min" ? valueMin : valueMax) + STEP_KEYS[event.key] * (event.shiftKey ? 5 : 1);
    else if (event.key === "Home") next = min;
    else if (event.key === "End") next = max;
    else return;
    event.preventDefault();
    next = clamp(next, min, max);
    if (which === "min") onChange(Math.min(next, valueMax), valueMax);
    else onChange(valueMin, Math.max(next, valueMin));
  };

  const handle = (which, value) => (
    <div role="slider" tabIndex={0} aria-label={`${which === "min" ? "From" : "To"} ${label.toLowerCase()}`}
      aria-valuemin={min} aria-valuemax={max} aria-valuenow={value} aria-valuetext={format(value)}
      className={cx(styles.handle, dragging === which && styles.dragging)} style={{ left: `${pct(value)}%` }}
      onKeyDown={onKeyDown(which)}
      onPointerDown={(e) => { if (e.button > 0) return; e.preventDefault(); setDragging(which); }}>
      <span className={styles.value} aria-hidden="true">{format(value)}</span>
    </div>
  );

  return (
    <div className={styles.slider} role="group" aria-labelledby={id}>
      <span id={id} className="visually-hidden">{label}</span>
      <div ref={trackRef} className={styles.track}>
        <span className={styles.fill} style={{ left: `${pct(valueMin)}%`, width: `${pct(valueMax) - pct(valueMin)}%` }} aria-hidden="true" />
        {handle("min", valueMin)}
        {handle("max", valueMax)}
      </div>
      <div className={styles.ends} aria-hidden="true">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}
