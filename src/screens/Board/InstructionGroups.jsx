import Disclosure from "../../ui/Disclosure.jsx";
import Segmented from "../../ui/Segmented.jsx";
import Toggle from "../../ui/Toggle.jsx";
import { Term } from "../../ui/Term.jsx";
import { IN_POSSESSION_DIALS, OUT_OF_POSSESSION_DIALS, DISCIPLINE_LABEL, MARKING_LABEL, CONCEPT } from "../../content/labels.js";
import { DialGroup, summarize } from "./dials.jsx";
import styles from "./Board.module.css";

const DISCIPLINE = [{ key: "structured", label: DISCIPLINE_LABEL.structured }, { key: "fluid", label: DISCIPLINE_LABEL.fluid }];
const MARKING = [{ key: "zonal", label: MARKING_LABEL.zonal }, { key: "man", label: MARKING_LABEL.man }];

export default function InstructionGroups({ instructions, pulse, onSet }) {
  return (
    <>
      <Disclosure title="In possession" summary={summarize(instructions, IN_POSSESSION_DIALS, [DISCIPLINE_LABEL[instructions.shape]])}>
        <DialGroup keys={IN_POSSESSION_DIALS} instructions={instructions} pulse={pulse} onSet={onSet} />
        <div className={styles.switch}>
          <span className={styles.switchLabel}><Term term="discipline">{CONCEPT.shape}</Term></span>
          <Segmented label={CONCEPT.shape} options={DISCIPLINE} value={instructions.shape} onChange={(v) => onSet("shape", v)} size="sm" />
        </div>
      </Disclosure>
      <Disclosure title="Out of possession" summary={summarize(instructions, OUT_OF_POSSESSION_DIALS, [MARKING_LABEL[instructions.marking], instructions.offsideTrap ? "Offside trap" : null].filter(Boolean))}>
        <DialGroup keys={OUT_OF_POSSESSION_DIALS} instructions={instructions} pulse={pulse} onSet={onSet} />
        <div className={styles.switch}>
          <span className={styles.switchLabel}><Term term="marking">Marking</Term></span>
          <Segmented label="Marking" options={MARKING} value={instructions.marking} onChange={(v) => onSet("marking", v)} size="sm" />
        </div>
        <div className={styles.switch}>
          <Toggle label="Offside trap" sub="Needs a high line and a quick back four" checked={instructions.offsideTrap} onChange={(v) => onSet("offsideTrap", v)} />
          <Term term="offside-trap" icon label="Offside trap" />
        </div>
      </Disclosure>
    </>
  );
}
