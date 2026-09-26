import IconButton from "./IconButton.jsx";
import { CloseIcon } from "./icons.jsx";
import styles from "./Callout.module.css";

export default function Callout({ title, onDismiss, children }) {
  return (
    <aside role="note" aria-label={title} className={styles.callout}>
      <div className={styles.body}>
        <strong className={styles.title}>{title}</strong>
        <p className={styles.text}>{children}</p>
      </div>
      {onDismiss && <IconButton label="Dismiss note" onClick={onDismiss}><CloseIcon /></IconButton>}
    </aside>
  );
}
