import { APPROACH_DIALS } from "../../content/labels.js";
import { DialGroup } from "./dials.jsx";
import styles from "./Board.module.css";

// The three dials that matter most, always visible (spec 04 §5.4).
export default function Approach({ instructions, pulse, onSet }) {
  return (
    <section className={styles.section} aria-labelledby="board-approach">
      <h3 id="board-approach" className={styles.subheading}>Approach</h3>
      <DialGroup keys={APPROACH_DIALS} instructions={instructions} pulse={pulse} onSet={onSet} />
    </section>
  );
}
