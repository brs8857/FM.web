import IconButton from "./IconButton.jsx";
import { CloseIcon } from "./icons.jsx";
import { cx } from "./cx.js";
import styles from "./Callout.module.css";

// A coach's note: one dismissable paragraph per screen (spec 04 §5.8).
export default function Callout({ title, onDismiss, children }) {
  return (
    <aside role="note" aria-label={title} className={cx(styles.callout, "slip")}>
      <div className={styles.body}>
        <strong className={styles.title}>{title}</strong>
        <p className={styles.text}>{children}</p>
      </div>
      {onDismiss && <IconButton label="Dismiss note" onClick={onDismiss}><CloseIcon /></IconButton>}
    </aside>
  );
}
