import TopBar from "../ui/TopBar.jsx";
import TabBar from "../ui/TabBar.jsx";
import { TABS } from "./nav.js";
import { useMediaQuery } from "./useMediaQuery.js";
import { cx } from "../ui/cx.js";
import styles from "./Shell.module.css";

export const RAIL_QUERY = "(min-width: 1024px)";

// The app frame (spec 04 §6): top bar, the tab panel, an optional sticky bar
// above the tabs, and the Club tab bar (bottom on phones and tablets, a left
// rail at 1024 px and up). Set-up and draft modes have no tab bar.
export default function Shell({ mode, tab, onTab, title, subtitle, onBack, next, end, sticky, children }) {
  const rail = useMediaQuery(RAIL_QUERY);
  const club = mode === "club";
  const tabs = club && <TabBar tabs={TABS} value={tab} onChange={onTab} orientation={rail ? "vertical" : "horizontal"} />;
  return (
    <div className={cx(styles.shell, club && rail && styles.withRail)} data-mode={mode}>
      {club && rail && <div className={styles.rail}>{tabs}</div>}
      <div className={styles.column}>
        <TopBar title={title} subtitle={subtitle} onBack={onBack} next={next} end={end} />
        <main className={styles.main} id={club ? `panel-${tab}` : undefined} role={club ? "tabpanel" : undefined} aria-labelledby={club ? `tab-${tab}` : undefined} tabIndex={-1}>
          {children}
        </main>
        {sticky && <div className={styles.sticky}>{sticky}</div>}
        {club && !rail && tabs}
      </div>
    </div>
  );
}
