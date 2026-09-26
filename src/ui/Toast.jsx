import { useEffect } from "react";
import { cx } from "./cx.js";
import styles from "./Toast.module.css";

// The status region stays mounted so a message is announced when it appears.
export default function Toast({ open, message, action, onAction, onClose, duration = 4000 }) {
  useEffect(() => {
    if (!open || !duration) return undefined;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [open, message, duration, onClose]);

  return (
    <div role="status" className={styles.host}>
      {open && (
        <div className={cx(styles.toast, "slip")}>
          <span className={styles.message}>{message}</span>
          {action && <button type="button" className={styles.action} onClick={onAction}>{action}</button>}
        </div>
      )}
    </div>
  );
}
