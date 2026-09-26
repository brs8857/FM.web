import { cx } from "./cx.js";
import styles from "./Stamp.module.css";

// Keyed on the value so a new number stamps in again.
export default function Stamp({ value, label, size = "lg", tone }) {
  return (
    <span key={String(value)} className={cx(styles.stamp, styles[size], tone && styles[tone], "stamp")}>
      <span className={cx(styles.value, "mono")}>{value}</span>
      {label && <span className={styles.label}>{label}</span>}
    </span>
  );
}
