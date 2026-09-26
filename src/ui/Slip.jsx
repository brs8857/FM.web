import { useId } from "react";
import { cx } from "./cx.js";
import styles from "./Slip.module.css";

export default function Slip({ kicker, title, children, as: Tag = "section", animate = true, className }) {
  const id = useId();
  return (
    <Tag className={cx(styles.slip, animate && "slip", className)} aria-labelledby={title ? id : undefined}>
      {(kicker || title) && (
        <header className={styles.header}>
          {kicker && <span className="strap">{kicker}</span>}
          {title && <h2 id={id} className={styles.title}>{title}</h2>}
        </header>
      )}
      {children}
    </Tag>
  );
}
