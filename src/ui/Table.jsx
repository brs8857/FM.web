import { cx } from "./cx.js";
import styles from "./Table.module.css";

// `ruleAfter(row)` draws a line under a row ("solid" or "dashed"), the way a
// printed table marks the promotion and relegation places.
export default function Table({ caption, captionHidden = false, columns, rows, rowKey, isHighlighted, ruleAfter, dense = false }) {
  return (
    <div className={styles.wrap}>
      <table className={cx(styles.table, dense && styles.dense)}>
        <caption className={cx(styles.caption, captionHidden && "visually-hidden")}>{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cx(c.align === "right" && styles.right, c.mono && "figures")}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className={cx(isHighlighted?.(row) && styles.highlight, styles[ruleAfter?.(row) ?? ""])}>
              {columns.map((c) => (
                <td key={c.key} className={cx(c.align === "right" && styles.right, c.mono && "figures")}>{c.render ? c.render(row) : row[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
