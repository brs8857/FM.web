import Chip from "./Chip.jsx";
import { useRovingKeys } from "./useRovingKeys.js";
import styles from "./ChipRow.module.css";

export default function ChipRow({ label, options, value, onChange, tone }) {
  const index = Math.max(0, options.findIndex((o) => o.key === value));
  const onKeyDown = useRovingKeys({ count: options.length, index, onMove: (i) => onChange(options[i].key), selector: '[role="radio"]' });
  return (
    <div role="radiogroup" aria-label={label} className={styles.row} onKeyDown={onKeyDown}>
      {options.map((o, i) => (
        <Chip key={o.key} role="radio" tone={tone} selected={o.key === value} sub={o.sub} disabled={o.disabled}
          tabIndex={i === index ? 0 : -1} onClick={() => onChange(o.key)}>
          {o.label}
        </Chip>
      ))}
    </div>
  );
}
