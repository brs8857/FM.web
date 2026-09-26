import Meter from "../../ui/Meter.jsx";
import { Term } from "../../ui/Term.jsx";
import { CONCEPT, cohesionLabel } from "../../content/labels.js";
import { t } from "../../content/t.js";
import { signed } from "../Season/MatchReport.jsx";
import styles from "./Board.module.css";

export function settleNote(settle) {
  const modifier = signed(settle.modifier);
  if (settle.changed) return t("season.changed", { modifier });
  if (settle.matches === 0) return t("season.fresh", { modifier });
  if (settle.modifier < 0) return t("season.bedding", { count: settle.matches, modifier });
  return t("season.settled", { count: settle.matches, bonus: settle.modifier > 0 ? ` (${modifier})` : "" });
}

// `memory` is what past seasons in this system add to cohesion (or a change
// takes away); `settle` is what this season's matches in it do for the next.
export default function IdentityLine({ identity, familiarity, memory, settle }) {
  return (
    <section className={styles.identity} aria-label="Identity and cohesion">
      <div className={styles.identityLine}>
        <span className={styles.identityChip}>{identity}</span>
        <Term term="identity" icon label={CONCEPT.style} />
      </div>
      <div className={styles.meterRow}>
        <Meter label={CONCEPT.familiarity} value={familiarity} valueLabel={cohesionLabel(familiarity)} />
        <Term term="cohesion" icon label={CONCEPT.familiarity} />
      </div>
      {memory && memory.bonus !== 0 && (
        <p className={styles.memory}>{memory.bonus > 0 ? t("board.memory.same", { count: memory.seasons, bonus: memory.bonus }) : t("board.memory.change", { penalty: -memory.bonus })}</p>
      )}
      {settle && (
        <p className={styles.memory}>
          {settleNote(settle)} <Term term="settling" icon label="Settling" />
        </p>
      )}
    </section>
  );
}
