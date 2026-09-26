import Dial from "../../ui/Dial.jsx";
import { DIAL_LABEL, DIAL_ENDS, DIAL_TERM, mentalityLabel } from "../../content/labels.js";
import styles from "./Board.module.css";

// A dial the last preset moved remounts with the slip motion, so the player
// sees what changed.
export function InstructionDial({ instructions, dialKey, pulse, onSet }) {
  const value = instructions[dialKey];
  const [left, right] = DIAL_ENDS[dialKey];
  const moved = pulse.keys.includes(dialKey);
  return (
    <div key={moved ? `${dialKey}-${pulse.n}` : dialKey} className={moved ? "slip" : undefined} data-testid={`dial-${dialKey}`}>
      <Dial label={DIAL_LABEL[dialKey]} value={value} onChange={(v) => onSet(dialKey, v)} leftLabel={left} rightLabel={right}
        valueLabel={dialKey === "mentality" ? mentalityLabel(value) : undefined} term={DIAL_TERM[dialKey]} />
    </div>
  );
}

// A dial is named in the summary once it is past a third either way.
export function summarize(instructions, keys, extras = []) {
  const words = keys.map((k) => {
    const v = instructions[k];
    if (v <= 33) return DIAL_ENDS[k][0];
    if (v >= 67) return DIAL_ENDS[k][1];
    return null;
  }).filter(Boolean);
  const parts = [...words, ...extras];
  return parts.length > 0 ? parts.join(" · ") : "All at neutral";
}

export function DialGroup({ keys, instructions, pulse, onSet }) {
  return (
    <div className={styles.dials}>
      {keys.map((k) => <InstructionDial key={k} instructions={instructions} dialKey={k} pulse={pulse} onSet={onSet} />)}
    </div>
  );
}
