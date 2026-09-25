import { cx } from "./cx.js";
import styles from "./Toggle.module.css";

export default function Toggle({ label, sub, checked, onChange, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}
      className={cx(styles.toggle, checked && styles.on)}>
      <span className={styles.text}>
        <span className={styles.label}>{label}</span>
        {sub && <span className={styles.sub}>{sub}</span>}
      </span>
      <span className={styles.track} aria-hidden="true"><span className={styles.knob} /></span>
    </button>
  );
}
