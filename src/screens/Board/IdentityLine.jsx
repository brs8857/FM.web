import { Term } from "../../ui/Term.jsx";
import { CONCEPT, cohesionLabel } from "../../content/labels.js";
import { t } from "../../content/t.js";
import { signed } from "../../content/format.js";
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
      <p className={styles.identityLine}>
        <Term term="identity">{CONCEPT.style}</Term> <span className={styles.identityChip}>{identity}</span>
      </p>
      <p className={styles.identityLine}>
        <Term term="cohesion">{CONCEPT.familiarity}</Term> <strong>{cohesionLabel(familiarity)}</strong> <span className={styles.figure}>{Math.round(familiarity)} of 100</span>
      </p>
      {memory && memory.bonus !== 0 && (
        <p className={styles.memory}>{memory.bonus > 0 ? t("board.memory.same", { count: memory.seasons, bonus: memory.bonus }) : t("board.memory.change", { penalty: -memory.bonus })}</p>
      )}
      {settle && (
        <p className={styles.memory}>
          <Term term="settling">{settleNote(settle)}</Term>
        </p>
      )}
    </section>
  );
}
