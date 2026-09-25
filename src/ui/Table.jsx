import { cx } from "./cx.js";
import styles from "./Table.module.css";

// A newsprint table: caption, column headers, tabular mono numbers, one
// optional highlighted row (yours).
export default function Table({ caption, captionHidden = false, columns, rows, rowKey, isHighlighted, dense = false }) {
  return (
    <div className={styles.wrap}>
      <table className={cx(styles.table, dense && styles.dense)}>
        <caption className={cx(styles.caption, captionHidden && "visually-hidden")}>{caption}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cx(c.align === "right" && styles.right, c.mono && "mono")}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className={isHighlighted?.(row) ? styles.highlight : undefined}>
              {columns.map((c) => (
                <td key={c.key} className={cx(c.align === "right" && styles.right, c.mono && "mono")}>{c.render ? c.render(row) : row[c.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
