import { cx } from "./cx.js";
import styles from "./IconButton.module.css";

export default function IconButton({ label, size = "md", tone = "plain", type = "button", className, children, ...rest }) {
  return (
    <button type={type} aria-label={label} title={label} className={cx(styles.button, styles[size], styles[tone], className)} {...rest}>
      {children}
    </button>
  );
}
