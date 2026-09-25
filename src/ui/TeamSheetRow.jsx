import { cx } from "./cx.js";
import styles from "./TeamSheetRow.module.css";

// One line of a printed team sheet: position code, name, the small print
// (age · nationality · side), the job, and an optional off-position mark.
export default function TeamSheetRow({ code, name, meta, job, mark, selected = false, onClick, trailing, dragHandle }) {
  const content = (
    <>
      <span className={cx(styles.code, "mono")}>{code}</span>
      <span className={styles.main}>
        <span className={styles.name}>{name}</span>
        {meta && <span className={styles.meta}>{meta}</span>}
      </span>
      {job && <span className={styles.job}>{job}</span>}
      {mark && (
        <span className={styles.mark} title={mark.title}>
          {mark.label}
          <span className="visually-hidden">, {mark.title}</span>
        </span>
      )}
      {trailing}
    </>
  );
  return (
    <li className={cx(styles.row, selected && styles.selected)}>
      {onClick ? (
        <button type="button" className={styles.button} onClick={onClick} aria-current={selected ? "true" : undefined}>{content}</button>
      ) : (
        <div className={styles.static}>{content}</div>
      )}
      {dragHandle}
    </li>
  );
}
