import { cx } from "./cx.js";
import styles from "./Cutting.module.css";

export default function Cutting({ kicker, title, subtitle, note, onOpen, selected = false, children, className }) {
  const body = (
    <>
      {kicker && <span className="strap">{kicker}</span>}
      <span className={styles.title}>{title}</span>
      {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
      {note && <span className={styles.note}>{note}</span>}
      {children}
    </>
  );
  if (!onOpen) return <article className={cx(styles.cutting, selected && styles.selected, className)}>{body}</article>;
  return (
    <button type="button" aria-haspopup="dialog" aria-pressed={selected} onClick={onOpen}
      className={cx(styles.cutting, styles.button, selected && styles.selected, className)}>
      {body}
    </button>
  );
}
