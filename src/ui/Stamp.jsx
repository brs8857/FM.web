import { cx } from "./cx.js";
import styles from "./Stamp.module.css";

// A revealed number that stamps in (scale 1.15 → 1). Changing the value
// remounts the element so the animation runs again.
export default function Stamp({ value, label, size = "lg", tone }) {
  return (
    <span key={String(value)} className={cx(styles.stamp, styles[size], tone && styles[tone], "stamp")}>
      <span className={cx(styles.value, "mono")}>{value}</span>
      {label && <span className={styles.label}>{label}</span>}
    </span>
  );
}
