import { FORMATIONS } from "../../engine/formations.js";
import { useRovingKeys } from "../../ui/useRovingKeys.js";
import { cx } from "../../ui/cx.js";
import styles from "./Formation.module.css";

const KEYS = Object.keys(FORMATIONS);

function MiniShape({ slots }) {
  return (
    <svg viewBox="0 0 68 100" className={styles.shape} aria-hidden="true" focusable="false">
      <rect x="2" y="2" width="64" height="96" />
      <line x1="2" y1="50" x2="66" y2="50" />
      {slots.map((s) => <circle key={s.id} cx={2 + (s.x / 100) * 64} cy={2 + (s.y / 100) * 96} r="3.2" className={styles.dot} />)}
    </svg>
  );
}

export default function Formation({ formationKey, onPick }) {
  const index = Math.max(0, KEYS.indexOf(formationKey));
  const onKeyDown = useRovingKeys({ count: KEYS.length, index, onMove: (i) => onPick(KEYS[i]), selector: '[role="radio"]' });
  return (
    <div className={styles.formation}>
      <h2 className={styles.heading}>Choose your shape</h2>
      <p className={styles.lede}>These are the eleven slots you will fill in the draft. You can move anyone anywhere on the board afterwards.</p>
      <div role="radiogroup" aria-label="Formation" className={styles.grid} onKeyDown={onKeyDown}>
        {KEYS.map((key, i) => {
          const selected = key === formationKey;
          return (
            <button key={key} type="button" role="radio" aria-checked={selected} tabIndex={i === index ? 0 : -1}
              className={cx(styles.option, selected && styles.selected)} onClick={() => onPick(key)}>
              <MiniShape slots={FORMATIONS[key].slots} />
              <span className={styles.label}>{FORMATIONS[key].label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
