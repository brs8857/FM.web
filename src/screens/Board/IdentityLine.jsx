import Meter from "../../ui/Meter.jsx";
import { Term } from "../../ui/Term.jsx";
import { CONCEPT, cohesionLabel } from "../../content/labels.js";
import { t } from "../../content/t.js";
import { signed } from "../Season/MatchReport.jsx";
import styles from "./Board.module.css";

// What settling does to the next match's cohesion, in words.
export function settleNote(settle) {
  const modifier = signed(settle.modifier);
  if (settle.changed) return t("season.changed", { modifier });
  if (settle.matches === 0) return t("season.fresh", { modifier });
  if (settle.modifier < 0) return t("season.bedding", { count: settle.matches, modifier });
  return t("season.settled", { count: settle.matches, bonus: settle.modifier > 0 ? ` (${modifier})` : "" });
}

// The identity chip and cohesion meter: the first thing on the Board, and
// the same line in pre-season and on match day. `memory` is what the seasons
// already played in this system add to (or a change takes from) cohesion;
// `settle` is what the matches played in it this season do for the next one.
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
