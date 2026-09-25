import Table from "../../ui/Table.jsx";
import { careerSeasonLabel } from "../../engine/season.js";
import { tierLabel, IDENTITY_LABEL } from "../../content/labels.js";
import { t } from "../../content/t.js";
import { ordinal } from "../Season/Vidiprinter.jsx";
import styles from "./Club.module.css";

const COLUMNS = [
  { key: "season", label: "Season", mono: true, render: (r) => careerSeasonLabel(r.season) },
  { key: "position", label: "Finish", mono: true, align: "right", render: (r) => ordinal(r.position) },
  { key: "pts", label: "Pts", mono: true, align: "right" },
  { key: "identity", label: "Identity", render: (r) => r.identity ?? IDENTITY_LABEL.bespoke },
  { key: "tier", label: "Verdict", render: (r) => tierLabel({ name: r.tier }).name },
];

export function recordSummary(history) {
  if (history.length === 0) return null;
  const best = history.reduce((b, s) => (s.position < b.position ? s : b));
  return {
    best, titles: history.filter((s) => s.position === 1).length,
    unbeaten: history.filter((s) => s.l === 0).length, points: history.reduce((sum, s) => sum + s.pts, 0),
  };
}

// The record (spec 04 §5.7): every completed season, plus the totals.
export default function Record({ history }) {
  const summary = recordSummary(history);
  if (!summary) return <p className={styles.empty}>No season in the book yet. It fills in as each one ends.</p>;
  return (
    <div className={styles.section}>
      <div className={styles.summary}>
        <div className={styles.stat}><span className={styles.statLabel}>Best finish</span><span className={styles.statValue}>{ordinal(summary.best.position)} · {careerSeasonLabel(summary.best.season)}</span></div>
        <div className={styles.stat}><span className={styles.statLabel}>Titles</span><span className={styles.statValue}>{t("club.titles", { count: summary.titles })}</span></div>
        <div className={styles.stat}><span className={styles.statLabel}>Unbeaten seasons</span><span className={styles.statValue}>{summary.unbeaten}</span></div>
      </div>
      <Table caption="The record" captionHidden columns={COLUMNS} rows={history} rowKey={(r) => r.season} dense />
    </div>
  );
}
