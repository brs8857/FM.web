import { cx } from "./cx.js";
import { useRovingKeys } from "./useRovingKeys.js";
import styles from "./Segmented.module.css";

// Equal-width exclusive choice (theme, marking, discipline). Same keyboard
// model as ChipRow.
export default function Segmented({ label, options, value, onChange, size = "md" }) {
  const index = Math.max(0, options.findIndex((o) => o.key === value));
  const onKeyDown = useRovingKeys({ count: options.length, index, onMove: (i) => onChange(options[i].key), selector: '[role="radio"]' });
  return (
    <div role="radiogroup" aria-label={label} className={cx(styles.group, styles[size])} onKeyDown={onKeyDown}>
      {options.map((o, i) => (
        <button key={o.key} type="button" role="radio" aria-checked={o.key === value} tabIndex={i === index ? 0 : -1}
          className={cx(styles.segment, o.key === value && styles.selected)} onClick={() => onChange(o.key)} disabled={o.disabled}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
