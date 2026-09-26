import { useId } from "react";
import IconButton from "./IconButton.jsx";
import { Term } from "./Term.jsx";
import { MinusIcon, PlusIcon } from "./icons.jsx";
import { cx } from "./cx.js";
import styles from "./Dial.module.css";

export default function Dial({ label, value, onChange, min = 0, max = 100, step = 5, leftLabel, rightLabel, valueLabel, term, disabled }) {
  const id = useId();
  const set = (v) => onChange(Math.max(min, Math.min(max, v)));
  const valueText = valueLabel ? `${value}, ${valueLabel}` : String(value);
  return (
    <div className={cx(styles.dial, disabled && styles.disabled)}>
      <div className={styles.head}>
        <label htmlFor={id} className={styles.label}>{label}</label>
        {term && <Term term={term} icon label={label} />}
        <span className={styles.value} aria-hidden="true">
          <span className="mono">{value}</span>
          {valueLabel && <span className={styles.valueLabel}>{valueLabel}</span>}
        </span>
      </div>
      <div className={styles.row}>
        <IconButton label={`Lower ${label}`} onClick={() => set(value - step)} disabled={disabled || value <= min}><MinusIcon /></IconButton>
        <input id={id} type="range" min={min} max={max} step={1} value={value} disabled={disabled}
          aria-valuetext={valueText} onChange={(e) => set(Number(e.target.value))} className={styles.range}
          style={{ "--fill": `${((value - min) / (max - min)) * 100}%` }} />
        <IconButton label={`Raise ${label}`} onClick={() => set(value + step)} disabled={disabled || value >= max}><PlusIcon /></IconButton>
      </div>
      {(leftLabel || rightLabel) && (
        <div className={styles.ends} aria-hidden="true">
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      )}
    </div>
  );
}
