import { signed } from "../content/format.js";
import { cx } from "./cx.js";
import styles from "./StrengthTable.module.css";

// The strengths as a paper prints figures: yours, the comparison, the gap.
export default function StrengthTable({ rows, referenceLabel = "Average opponent", caption = "Strengths" }) {
  const compared = rows.some((r) => r.reference != null);
  return (
    <table className={styles.table}>
      <caption className="visually-hidden">{caption}</caption>
      <thead>
        <tr>
          <th scope="col"><span className="visually-hidden">Strength</span></th>
          <th scope="col" className={styles.num}>You</th>
          {compared && <th scope="col" className={styles.num}>{referenceLabel}</th>}
          {compared && <th scope="col" className={styles.num}><span className="visually-hidden">Difference</span></th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const value = Math.round(row.value);
          const reference = row.reference == null ? null : Math.round(row.reference);
          const gap = reference === null ? null : value - reference;
          return (
            <tr key={row.key ?? row.label}>
              <th scope="row" className={styles.label}>{row.label}</th>
              <td className={styles.num}>{value}</td>
              {compared && <td className={cx(styles.num, styles.reference)}>{reference ?? "–"}</td>}
              {compared && <td className={cx(styles.num, gap > 0 && styles.ahead, gap < 0 && styles.behind)}>{gap === null ? "" : gap === 0 ? "level" : signed(gap)}</td>}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
