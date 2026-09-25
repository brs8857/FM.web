import { useEffect } from "react";
import { cx } from "./cx.js";
import styles from "./Toast.module.css";

// A short status message. The status region is always mounted so the message
// is announced when it appears; it clears itself after `duration` ms.
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
