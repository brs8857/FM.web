import { useId } from "react";
import StrengthBars from "../../ui/StrengthBars.jsx";
import { Term } from "../../ui/Term.jsx";
import { STRENGTH_KEYS, STRENGTH_LABEL } from "../../content/labels.js";
import { tacticalReadout } from "../../engine/readout.js";
import { rivalStrength } from "../../engine/match.js";
import styles from "./Board.module.css";

// The tick is the average of the strengths the match engine plays you against.
export function opponentsAverage(opponents) {
  if (!opponents?.length) return null;
  return opponents.reduce((sum, o) => sum + rivalStrength(o), 0) / opponents.length;
}

// `reference` puts one opponent's strength in place of the average (the fixture card).
export default function Strengths({ profile, familiarity, instructions, opponents, reference, notes = 3 }) {
  const id = useId();
  const tick = reference ?? { value: opponentsAverage(opponents), label: "average opponent" };
  const bars = STRENGTH_KEYS.map((key) => ({ key, label: STRENGTH_LABEL[key], value: profile[key], reference: tick.value }));
  const readout = tacticalReadout(profile, instructions, familiarity).slice(0, notes);
  return (
    <section className={styles.section} aria-labelledby={id}>
      <h2 id={id} className={styles.subheading}><Term term="strengths">Strengths</Term></h2>
      <StrengthBars bars={bars} referenceLabel={tick.label} />
      {readout.length > 0 && (
        <ul className={styles.notes}>
          {readout.map((note) => <li key={note}>{note}</li>)}
        </ul>
      )}
    </section>
  );
}
