import { useId } from "react";
import { cx } from "./cx.js";
import styles from "./Slip.module.css";

// A printed slip: a paper panel with 4 px corners and the slip motion.
export default function Slip({ kicker, title, children, as: Tag = "section", animate = true, className }) {
  const id = useId();
  return (
    <Tag className={cx(styles.slip, animate && "slip", className)} aria-labelledby={title ? id : undefined}>
      {(kicker || title) && (
        <header className={styles.header}>
          {kicker && <span className={styles.kicker}>{kicker}</span>}
          {title && <h2 id={id} className={styles.title}>{title}</h2>}
        </header>
      )}
      {children}
    </Tag>
  );
}
