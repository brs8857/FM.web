import { cx } from "./cx.js";
import styles from "./Button.module.css";

export default function Button({ variant = "primary", size = "md", block = false, type = "button", className, children, ...rest }) {
  return (
    <button type={type} className={cx(styles.button, styles[variant], styles[size], block && styles.block, className)} {...rest}>
      {children}
    </button>
  );
}
