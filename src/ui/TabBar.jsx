import { useRovingKeys } from "./useRovingKeys.js";
import { cx } from "./cx.js";
import styles from "./TabBar.module.css";

// The Club tab bar: a bottom bar on phones, a left rail at ≥ 1024 px. Tabs are
// a tablist with roving focus; each tab controls the panel `panel-<key>`.
export default function TabBar({ tabs, value, onChange, orientation = "horizontal", label = "Club" }) {
  const index = Math.max(0, tabs.findIndex((t) => t.key === value));
  const onKeyDown = useRovingKeys({ count: tabs.length, index, onMove: (i) => onChange(tabs[i].key), selector: '[role="tab"]', orientation });
  return (
    <nav className={cx(styles.bar, styles[orientation])} aria-label={label}>
      <div role="tablist" aria-orientation={orientation} className={styles.list} onKeyDown={onKeyDown}>
        {tabs.map((t, i) => {
          const selected = t.key === value;
          return (
            <button key={t.key} type="button" role="tab" id={`tab-${t.key}`} aria-selected={selected} aria-controls={`panel-${t.key}`}
              tabIndex={i === index ? 0 : -1} className={cx(styles.tab, selected && styles.active)} onClick={() => onChange(t.key)}>
              {t.icon && <span className={styles.icon} aria-hidden="true">{t.icon}</span>}
              <span className={styles.label}>{t.label}</span>
              {t.badge && <span className={styles.badge} aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
