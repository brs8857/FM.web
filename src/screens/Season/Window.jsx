import { useState } from "react";
import Chalkboard from "../../pitch/Chalkboard.jsx";
import Button from "../../ui/Button.jsx";
import Cutting from "../../ui/Cutting.jsx";
import Callout from "../../ui/Callout.jsx";
import { useAnnounce } from "../../ui/LiveRegion.jsx";
import CoachNote from "../../app/CoachNote.jsx";
import PlayerSheet from "../Squad/PlayerSheet.jsx";
import { POSITION_LABEL } from "../../content/labels.js";
import { t } from "../../content/t.js";
import { careerSeasonLabel } from "../../engine/season.js";
import { playerMeta } from "../Draft/CuttingSheet.jsx";
import layout from "../TabLayout.module.css";
import styles from "./Season.module.css";

export function eligibleSlots(assignments, player) {
  const matching = assignments.filter((a) => a.type === player.slot);
  return (matching.length > 0 ? matching : assignments).map((a) => a.slotId);
}

// The transfer window (spec 04 §5.5): five candidates as cuttings; Replace
// highlights the eligible slots on the pinned chalkboard.
export default function Window({ state, dispatch, clubSeason, clubName, prefs, onDismissNote }) {
  const announce = useAnnounce();
  const [target, setTarget] = useState(null);
  const [replacing, setReplacing] = useState(null);
  const candidate = replacing !== null ? state.shortlist[replacing] : null;
  const highlight = candidate ? eligibleSlots(state.assignments, candidate.player) : [];
  const changes = state.lastTransition;

  const onSelect = (kind, id) => {
    if (candidate && kind === "slot" && highlight.includes(id)) {
      const out = state.assignments.find((a) => a.slotId === id)?.player;
      dispatch({ type: "SIGN_SHORTLIST_TO_XI", index: replacing, slotId: id });
      setReplacing(null);
      announce(`${candidate.player.name} signed at ${POSITION_LABEL[state.assignments.find((a) => a.slotId === id).type].toLowerCase()}${out ? `, replacing ${out.name}` : ""}.`);
      return;
    }
    setTarget({ kind, id });
  };
  const signBench = (i) => {
    dispatch({ type: "SIGN_SHORTLIST_TO_BENCH", index: i });
    announce(`${state.shortlist[i].player.name} signed to the bench.`);
  };
  const startReplace = (i) => {
    setReplacing(i);
    const slots = eligibleSlots(state.assignments, state.shortlist[i].player);
    announce(`Choose who ${state.shortlist[i].player.name} replaces: ${slots.join(", ")} highlighted on the board.`);
  };

  return (
    <div className={layout.tab}>
      <div className={layout.board}>
        <Chalkboard assignments={state.assignments} bench={state.bench} mode="view" compact highlightSlots={highlight} onSelect={onSelect} onOpenSheet={onSelect} dispatch={dispatch} />
        {candidate && (
          <div className={styles.replaceBar} role="status">
            <span>Tap a highlighted marker for {candidate.player.name} to replace.</span>
            <Button size="sm" variant="ghost" onClick={() => setReplacing(null)}>Cancel</Button>
          </div>
        )}
      </div>
      <div className={layout.content}>
        <header>
          <h2 className={styles.heading}>The window · before {careerSeasonLabel(state.season + 1)}</h2>
          <p className={styles.lede}>Five players have become available. Sign them to the bench, or straight into the XI in someone's place.</p>
        </header>
        <CoachNote id="window" prefs={prefs} onDismiss={onDismissNote} />
        {changes && changes.relegated.length > 0 && (
          <Callout title="League changes">
            {t("window.changes", { relegated: changes.relegated.map(clubName).join(", "), promoted: changes.promoted.map(clubName).join(", ") })}
          </Callout>
        )}
        <ul className={styles.candidates}>
          {state.shortlist.map((entry, i) => (
            <li key={entry.player.id}>
              <Cutting kicker={clubSeason(entry.player.seasonKey)} title={entry.player.name} selected={replacing === i}
                subtitle={`${POSITION_LABEL[entry.player.slot] ?? entry.player.slot} · ${playerMeta(entry.player)}`}>
                <div className={styles.candidateActions}>
                  {entry.signed ? (
                    <span className={styles.signed}>Signed</span>
                  ) : (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => signBench(i)}>Sign to bench</Button>
                      <Button size="sm" onClick={() => startReplace(i)} aria-pressed={replacing === i}>Replace…</Button>
                    </>
                  )}
                </div>
              </Cutting>
            </li>
          ))}
        </ul>
      </div>
      <PlayerSheet target={target} state={state} dispatch={dispatch} clubSeason={clubSeason} onClose={() => setTarget(null)} />
    </div>
  );
}
