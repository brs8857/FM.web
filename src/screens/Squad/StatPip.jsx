import { cx } from "../../ui/cx.js";
import styles from "./StatPip.module.css";

// Five bands, no numbers (owner decision U3). Thresholds sit on the dataset's
// stat quintiles so every band is used and no overall can be back-computed.
export const BANDS = [
  { min: 87, word: "Elite" }, { min: 79, word: "Strong" }, { min: 71, word: "Good" }, { min: 62, word: "Modest" }, { min: -Infinity, word: "Weak" },
];

export function statBand(value) {
  const i = BANDS.findIndex((b) => value >= b.min);
  return { band: BANDS.length - i, word: BANDS[i].word };
}

export default function StatPip({ label, value }) {
  const { band, word } = statBand(value);
  return (
    <div className={styles.pip} role="meter" aria-label={label} aria-valuemin={1} aria-valuemax={5} aria-valuenow={band} aria-valuetext={`${word}, ${band} of 5`}>
      <span className={styles.label}>{label}</span>
      <span className={styles.dots} aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => <span key={i} className={cx(styles.dot, i <= band && styles.filled)} />)}
      </span>
      <span className={styles.word} aria-hidden="true">{word}</span>
    </div>
  );
}
