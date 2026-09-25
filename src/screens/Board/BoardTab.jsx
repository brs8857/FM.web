import { useState } from "react";
import Chalkboard from "../../pitch/Chalkboard.jsx";
import Button from "../../ui/Button.jsx";
import Meter from "../../ui/Meter.jsx";
import { Term } from "../../ui/Term.jsx";
import { useAnnounce } from "../../ui/LiveRegion.jsx";
import CoachNote from "../../app/CoachNote.jsx";
import PlayerSheet from "../Squad/PlayerSheet.jsx";
import StyleRow from "./StyleRow.jsx";
import Approach from "./Approach.jsx";
import InstructionGroups from "./InstructionGroups.jsx";
import Strengths from "./Strengths.jsx";
import { STYLE_PRESETS } from "../../engine/instructions.js";
import { CONCEPT, cohesionLabel, identityLabel } from "../../content/labels.js";
import { cx } from "../../ui/cx.js";
import layout from "../TabLayout.module.css";
import styles from "./Board.module.css";

// The Board tab (spec 04 §5.4): the draggable chalkboard, the identity line,
// the style row, the three approach dials, the two collapsed groups, and the
// strengths bars.
export default function BoardTab({ state, dispatch, profile, familiarity, clubSeason, revealed, prefs, onDismissNote }) {
  const announce = useAnnounce();
  const [target, setTarget] = useState(null);
  const [pulse, setPulse] = useState({ keys: [], n: 0 });
  const open = (kind, id) => setTarget({ kind, id });
  const onSet = (key, value) => dispatch({ type: "SET_INSTRUCTION", key, value });
  const onStyle = (key) => {
    const preset = STYLE_PRESETS.find((p) => p.key === key);
    if (!preset) return;
    const keys = Object.keys(preset.instructions).filter((k) => preset.instructions[k] !== state.instructions[k]);
    setPulse((p) => ({ keys, n: p.n + 1 }));
    dispatch({ type: "SET_STYLE", key });
    announce(`${preset.label} set. ${keys.length === 0 ? "Nothing changed." : `${keys.length} dials moved.`}`);
  };
  const identity = identityLabel(profile.synergyLabel, state.instructions);

  return (
    <div className={cx(layout.tab, layout.wide)}>
      <div className={layout.board}>
        <Chalkboard assignments={state.assignments} bench={state.bench} mode="board" compact onSelect={open} onOpenSheet={open} dispatch={dispatch} announce={announce} />
        <div className={styles.boardTools}>
          <p className={styles.hint}>Drag a marker anywhere, or drop it on a teammate to swap. Tab to a marker and press Enter to move it with the keys.</p>
          <Button variant="ghost" size="sm" onClick={() => { dispatch({ type: "RESET_POSITIONS" }); announce("Shape reset."); }}>Reset shape</Button>
        </div>
      </div>
      <div className={layout.content}>
        <CoachNote id="board" prefs={prefs} onDismiss={onDismissNote} />
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
        <section className={styles.section} aria-labelledby="board-style">
          <h3 id="board-style" className={styles.subheading}>Style</h3>
          <StyleRow selectedStyle={state.selectedStyle} onSelect={onStyle} />
        </section>
        <Approach instructions={state.instructions} pulse={pulse} onSet={onSet} />
        <InstructionGroups instructions={state.instructions} pulse={pulse} onSet={onSet} />
      </div>
      <div className={styles.strengthsColumn}>
        <Strengths profile={profile} familiarity={familiarity} instructions={state.instructions} opponents={state.opponents} />
      </div>
      <PlayerSheet target={target} state={state} dispatch={dispatch} clubSeason={clubSeason} revealed={revealed} onClose={() => setTarget(null)} />
    </div>
  );
}
