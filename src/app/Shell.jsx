import TopBar from "../ui/TopBar.jsx";
import TabBar from "../ui/TabBar.jsx";
import { TABS } from "./nav.js";
import { useMediaQuery } from "./useMediaQuery.js";
import { cx } from "../ui/cx.js";
import styles from "./Shell.module.css";

export const RAIL_QUERY = "(min-width: 1024px)";

// The app frame (spec 04 §6): top bar, the tab panel, an optional sticky bar
// above the tabs, and the Club tab bar (bottom on phones and tablets, a left
// rail at 1024 px and up). Set-up and draft modes have no tab bar; Home has
// no top bar (it carries its own masthead).
export default function Shell({ mode, tab, onTab, title, subtitle, onBack, start, next, end, sticky, children }) {
  const rail = useMediaQuery(RAIL_QUERY);
  const club = mode === "club";
  const tabs = club && <TabBar tabs={TABS} value={tab} onChange={onTab} orientation={rail ? "vertical" : "horizontal"} />;
  return (
    <div className={cx(styles.shell, club && rail && styles.withRail)} data-mode={mode}>
      {club && rail && <div className={styles.rail}>{tabs}</div>}
      <div className={styles.column}>
        {title !== undefined && (
          <div className={styles.top}>
            <TopBar title={title} subtitle={subtitle} onBack={onBack} start={start} next={next} end={end} />
          </div>
        )}
        <main className={styles.main} tabIndex={-1}>
          {club ? <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>{children}</div> : children}
        </main>
        {sticky && <div className={styles.sticky}>{sticky}</div>}
        {club && !rail && tabs}
      </div>
    </div>
  );
}
