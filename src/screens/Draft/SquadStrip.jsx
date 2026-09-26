import { t } from "../../content/t.js";
import { cohesionLabel } from "../../content/labels.js";
import styles from "./Draft.module.css";

// `bench` (from selectBenchSummary) once the XI is in: how many, by line.
export default function SquadStrip({ summary, bench = null }) {
  const parts = [t("draft.picked", { count: summary.picked })];
  if (summary.decades.length > 0) parts.push(summary.decades.map((d) => t("draft.spread", { count: d.count, decade: d.label })).join(", "));
  if (summary.complete) parts.push(`Cohesion: ${cohesionLabel(summary.cohesion)}`);
  else if (summary.picked > 1) parts.push(t("draft.eraSpread", { years: summary.spread, cost: summary.eraPenalty }));
  if (bench) {
    const lines = bench.lines.filter((l) => l.count > 0).map((l) => `${l.line} ${l.count}`);
    parts.push([t("draft.benchSoFar", { count: bench.picked, size: bench.size }), ...lines].join(" · "));
  }
  return <p className={styles.strip} aria-label="Squad so far">{parts.join(" · ")}</p>;
}
