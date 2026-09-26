import { APPROACH_DIALS } from "../../content/labels.js";
import { DialGroup } from "./dials.jsx";
import styles from "./Board.module.css";

export default function Approach({ instructions, pulse, onSet }) {
  return (
    <section className={styles.section} aria-labelledby="board-approach">
      <h2 id="board-approach" className={styles.subheading}>Approach</h2>
      <DialGroup keys={APPROACH_DIALS} instructions={instructions} pulse={pulse} onSet={onSet} />
    </section>
  );
}
