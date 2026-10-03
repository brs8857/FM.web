import { useRovingKeys } from "../../ui/useRovingKeys.js";
import { cx } from "../../ui/cx.js";
import { seasonLabel } from "../../engine/util.js";
import { ERAS } from "../../state/initialState.js";
import styles from "./League.module.css";

export const LEAGUES = [
  { key: "top", label: "Top flight", line: "Twenty clubs, 38 games. Win it, or finish in the bottom three and go down to the Championship." },
  { key: "championship", label: "Championship", line: "Twenty-four clubs, 46 games. The top two go up, 3rd to 6th play off for the last place." },
];

export default function League({ league, onPick }) {
  const index = Math.max(0, LEAGUES.findIndex((l) => l.key === league));
  const onKeyDown = useRovingKeys({ count: LEAGUES.length, index, onMove: (i) => onPick(LEAGUES[i].key), selector: '[role="radio"]' });
  return (
    <div className={styles.league}>
      <h2 className={styles.heading}>Which league?</h2>
      <p className={styles.lede}>Your XI is drafted from the real squads of the league you start in, and takes a place in it. Promotion and relegation carry the career between the two.</p>
      <div role="radiogroup" aria-label="League" className={styles.list} onKeyDown={onKeyDown}>
        {LEAGUES.map((l, i) => {
          const selected = l.key === league;
          return (
            <button key={l.key} type="button" role="radio" aria-checked={selected} tabIndex={i === index ? 0 : -1}
              className={cx(styles.option, selected && styles.selected)} onClick={() => onPick(l.key)}>
              <span className={styles.label}>{l.label}</span>
              <span className={styles.years}>{seasonLabel(ERAS[l.key].min)} to {seasonLabel(ERAS[l.key].max)}</span>
              <span className={styles.line}>{l.line}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
