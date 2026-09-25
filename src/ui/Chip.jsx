import { forwardRef } from "react";
import { cx } from "./cx.js";
import styles from "./Chip.module.css";

const Chip = forwardRef(function Chip({ selected = false, sub, role, tone = "ink", type = "button", className, children, ...rest }, ref) {
  const state = role === "radio" ? { "aria-checked": selected } : { "aria-pressed": selected };
  return (
    <button ref={ref} type={type} role={role} {...state} className={cx(styles.chip, styles[tone], selected && styles.selected, className)} {...rest}>
      <span className={styles.label}>{children}</span>
      {sub && <span className={styles.sub}>{sub}</span>}
    </button>
  );
});

export default Chip;
