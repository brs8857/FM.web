import { ArrowIcon } from "./icons.jsx";
import { cx } from "./cx.js";
import styles from "./NextPill.module.css";

export default function NextPill({ label, onClick, disabled, className }) {
  return (
    <button type="button" className={cx(styles.pill, className)} onClick={onClick} disabled={disabled}>
      <span className={styles.kicker} aria-hidden="true">Next</span>
      <span className={styles.label}>{label}</span>
      <ArrowIcon />
    </button>
  );
}
