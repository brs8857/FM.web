import { t } from "../../content/t.js";
import { cohesionLabel } from "../../content/labels.js";
import styles from "./Draft.module.css";

// One line under the board: "4 picked · 3 from the '90s, 1 from the 2010s · Era spread 11 years".
export default function SquadStrip({ summary }) {
  const parts = [t("draft.picked", { count: summary.picked })];
  if (summary.decades.length > 0) parts.push(summary.decades.map((d) => t("draft.spread", { count: d.count, decade: d.label })).join(", "));
  if (summary.complete) parts.push(`Cohesion: ${cohesionLabel(summary.cohesion)}`);
  else if (summary.picked > 1) parts.push(t("draft.eraSpread", { years: summary.spread, cost: summary.eraPenalty }));
  return <p className={styles.strip} aria-label="Squad so far">{parts.join(" · ")}</p>;
}
