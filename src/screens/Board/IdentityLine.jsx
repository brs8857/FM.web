import Meter from "../../ui/Meter.jsx";
import { Term } from "../../ui/Term.jsx";
import { CONCEPT, cohesionLabel } from "../../content/labels.js";
import styles from "./Board.module.css";

// The identity chip and cohesion meter: the first thing on the Board, and
// the same line in pre-season.
export default function IdentityLine({ identity, familiarity }) {
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
    </section>
  );
}
