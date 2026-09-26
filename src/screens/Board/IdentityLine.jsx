import Meter from "../../ui/Meter.jsx";
import { Term } from "../../ui/Term.jsx";
import { CONCEPT, cohesionLabel } from "../../content/labels.js";
import { t } from "../../content/t.js";
import styles from "./Board.module.css";

// The identity chip and cohesion meter: the first thing on the Board, and
// the same line in pre-season. `memory` is what the seasons already played
// in this system add to (or a change takes from) cohesion.
export default function IdentityLine({ identity, familiarity, memory }) {
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
    </section>
  );
}
