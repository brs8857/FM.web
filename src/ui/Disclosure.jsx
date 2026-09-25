import { useId, useState } from "react";
import { ChevronIcon } from "./icons.jsx";
import { cx } from "./cx.js";
import styles from "./Disclosure.module.css";

export default function Disclosure({ title, summary, defaultOpen = false, open: controlled, onToggle, children }) {
  const [own, setOwn] = useState(defaultOpen);
  const open = controlled ?? own;
  const id = useId();
  const toggle = () => {
    if (controlled === undefined) setOwn(!open);
    onToggle?.(!open);
  };
  return (
    <section className={styles.disclosure}>
      <h3 className={styles.heading}>
        <button type="button" aria-expanded={open} aria-controls={id} onClick={toggle} className={styles.trigger}>
          <span className={styles.text}>
            <span className={styles.title}>{title}</span>
            {summary && <span className={styles.summary}>{summary}</span>}
          </span>
          <ChevronIcon open={open} />
        </button>
      </h3>
      <div id={id} hidden={!open} className={cx(styles.panel, open && "slip")}>{children}</div>
    </section>
  );
}
