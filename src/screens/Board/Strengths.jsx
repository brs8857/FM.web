import StrengthBars from "../../ui/StrengthBars.jsx";
import { Term } from "../../ui/Term.jsx";
import { STRENGTH_KEYS, STRENGTH_LABEL } from "../../content/labels.js";
import { tacticalReadout } from "../../engine/readout.js";
import styles from "./Board.module.css";

// The match engine measures the profile against each rival's effective
// strength (this season's squad blended with its history), so the tick on
// every bar is the average of those nineteen numbers.
export function opponentsAverage(opponents) {
  if (!opponents?.length) return null;
  return opponents.reduce((sum, o) => sum + (o.ov * 0.82 + o.histMean * 0.18), 0) / opponents.length;
}

export default function Strengths({ profile, familiarity, instructions, opponents, notes = 3 }) {
  const reference = opponentsAverage(opponents);
  const bars = STRENGTH_KEYS.map((key) => ({ key, label: STRENGTH_LABEL[key], value: profile[key], reference }));
  const readout = tacticalReadout(profile, instructions, familiarity).slice(0, notes);
  return (
    <section className={styles.section} aria-labelledby="board-strengths">
      <h3 id="board-strengths" className={styles.subheading}><Term term="strengths">Strengths</Term></h3>
      <StrengthBars bars={bars} referenceLabel="average opponent" />
      <ul className={styles.notes}>
        {readout.map((note) => <li key={note}>{note}</li>)}
      </ul>
    </section>
  );
}
