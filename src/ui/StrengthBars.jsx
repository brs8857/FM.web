import { cx } from "./cx.js";
import styles from "./StrengthBars.module.css";

export default function StrengthBars({ bars, referenceLabel = "opponents' average", max = 100 }) {
  return (
    <ul className={styles.list}>
      {bars.map((bar) => {
        const value = Math.round(bar.value);
        const reference = bar.reference == null ? null : Math.round(bar.reference);
        const text = reference === null ? `${bar.label} ${value}` : `${bar.label} ${value}, ${referenceLabel} ${reference}`;
        return (
          <li key={bar.key ?? bar.label} className={styles.row}>
            <span className={styles.label}>{bar.label}</span>
            <div role="meter" aria-label={bar.label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-valuetext={text} className={styles.track}>
              <span className={styles.fill} style={{ width: `${(value / max) * 100}%` }} />
              {reference !== null && <span className={styles.tick} style={{ left: `${(reference / max) * 100}%` }} aria-hidden="true" />}
            </div>
            <span className={cx(styles.value, "mono")} aria-hidden="true">{value}</span>
          </li>
        );
      })}
    </ul>
  );
}
