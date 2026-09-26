import { useMemo } from "react";
import { CLUBS } from "../../content/clubTheme.js";
import { clubName } from "../../content/clubs.js";
import { useRovingKeys } from "../../ui/useRovingKeys.js";
import { cx } from "../../ui/cx.js";
import styles from "./ClubPicker.module.css";

const PITCH = { key: null, label: "Pitch", sub: "the default green" };

// The swatches are the clubs' own colours from the data, not design tokens.
export default function ClubPicker({ value = null, mode = "real", onChange, label = "Colours" }) {
  const options = useMemo(() => [
    PITCH,
    ...CLUBS.map((c) => ({ key: c.key, label: clubName(c.name, mode), colours: c.colours })).sort((a, b) => a.label.localeCompare(b.label)),
  ], [mode]);
  const index = Math.max(0, options.findIndex((o) => o.key === value));
  const onKeyDown = useRovingKeys({ count: options.length, index, onMove: (i) => onChange(options[i].key), selector: '[role="radio"]' });
  return (
    <div role="radiogroup" aria-label={label} className={styles.grid} onKeyDown={onKeyDown}>
      {options.map((o, i) => {
        const selected = o.key === value;
        return (
          <button key={o.key ?? "pitch"} type="button" role="radio" aria-checked={selected} tabIndex={i === index ? 0 : -1}
            className={cx(styles.option, selected && styles.selected)} onClick={() => onChange(o.key)}>
            <span className={styles.swatch} aria-hidden="true" style={o.colours ? { "--swatch-a": o.colours[0], "--swatch-b": o.colours[1] } : undefined} />
            <span className={styles.text}>
              <span className={styles.label}>{o.label}</span>
              {o.sub && <span className={styles.sub}>{o.sub}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
