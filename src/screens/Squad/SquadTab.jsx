import { useState } from "react";
import Chalkboard from "../../pitch/Chalkboard.jsx";
import TeamSheetRow from "../../ui/TeamSheetRow.jsx";
import CoachNote from "../../app/CoachNote.jsx";
import PlayerSheet, { BAN_MARK } from "./PlayerSheet.jsx";
import { POSITION_LABEL, roleLabel, briefLabel } from "../../content/labels.js";
import { playerMeta } from "../Draft/CuttingSheet.jsx";
import { isBanned } from "../../state/selectors.js";
import layout from "../TabLayout.module.css";

// A banned starter's mark outranks an off-position one: it blocks Play.
function markFor(a, suspended) {
  if (!a.player) return undefined;
  if (suspended?.has(a.player.id)) return BAN_MARK;
  return a.player.slot !== a.type ? { label: "off", title: `Not a ${POSITION_LABEL[a.type].toLowerCase()}` } : undefined;
}

// The Squad tab (spec 04 §5.3): pinned board, team sheet, player sheets.
export default function SquadTab({ state, dispatch, clubSeason, revealed, suspended, prefs, onDismissNote }) {
  const [target, setTarget] = useState(null);
  const open = (kind, id) => setTarget({ kind, id });
  return (
    <div className={layout.tab}>
      <div className={layout.board}>
        <Chalkboard assignments={state.assignments} bench={state.bench} mode="view" compact onSelect={open} onOpenSheet={open} dispatch={dispatch} suspended={suspended} />
      </div>
      <div className={layout.content}>
        <CoachNote id="squad" prefs={prefs} onDismiss={onDismissNote} />
        <section>
          <h2 className={layout.heading}>Team sheet</h2>
          <ul className={layout.rows}>
            {state.assignments.map((a) => (
              <TeamSheetRow key={a.slotId} code={a.type} name={a.player?.name ?? "Empty"} meta={a.player ? playerMeta(a.player) : undefined}
                job={a.player ? `${roleLabel(a.type, a.role)} · ${briefLabel(a.duty)}` : undefined}
                mark={markFor(a, suspended)}
                selected={target?.kind === "slot" && target.id === a.slotId} onClick={a.player ? () => open("slot", a.slotId) : undefined} />
            ))}
          </ul>
        </section>
        {state.bench.length > 0 && (
          <section>
            <h3 className={layout.subheading}>Bench</h3>
            <ul className={layout.rows}>
              {state.bench.map((b, i) => b.player && (
                <TeamSheetRow key={i} code={b.player.slot} name={b.player.name} meta={playerMeta(b.player)}
                  mark={isBanned(state, b.player) ? BAN_MARK : undefined}
                  selected={target?.kind === "bench" && target.id === i} onClick={() => open("bench", i)} />
              ))}
            </ul>
          </section>
        )}
      </div>
      <PlayerSheet target={target} state={state} dispatch={dispatch} clubSeason={clubSeason} revealed={revealed} onClose={() => setTarget(null)} />
    </div>
  );
}
