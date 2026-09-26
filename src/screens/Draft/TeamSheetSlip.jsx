import Slip from "../../ui/Slip.jsx";
import TeamSheetRow from "../../ui/TeamSheetRow.jsx";
import SquadStrip from "./SquadStrip.jsx";
import { FORMATIONS } from "../../engine/formations.js";
import { playerMeta } from "./CuttingSheet.jsx";
import styles from "./Draft.module.css";

export default function TeamSheetSlip({ state, summary }) {
  return (
    <Slip kicker="Team sheet" title={`Your XI · ${FORMATIONS[state.formationKey].label}`}>
      <ul className={styles.rows}>
        {state.assignments.map((a) => <TeamSheetRow key={a.slotId} code={a.slotId} name={a.player.name} meta={playerMeta(a.player)} />)}
      </ul>
      {state.bench.length > 0 && (
        <>
          <h3 className={styles.benchHeading}>Bench</h3>
          <ul className={styles.rows}>
            {state.bench.map((b, i) => <TeamSheetRow key={i} code={b.player.slot} name={b.player.name} meta={playerMeta(b.player)} />)}
          </ul>
        </>
      )}
      <SquadStrip summary={summary} />
    </Slip>
  );
}
