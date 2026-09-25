import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Chalkboard from "../../pitch/Chalkboard.jsx";
import CoachNote from "../../app/CoachNote.jsx";
import { useAnnounce } from "../../ui/LiveRegion.jsx";
import { selectDraftSummary, selectEraIndex, previewPick } from "../../state/selectors.js";
import { nextEmptySlotIndex } from "../../engine/squad.js";
import { POSITION_LABEL } from "../../content/labels.js";
import SquadStrip from "./SquadStrip.jsx";
import Draw from "./Draw.jsx";
import CuttingSheet from "./CuttingSheet.jsx";
import ConfirmPick from "./ConfirmPick.jsx";
import TeamSheetSlip from "./TeamSheetSlip.jsx";
import styles from "./Draft.module.css";

// The draft (spec 04 §5.2): a compact chalkboard, the squad strip, the draw.
export default function Draft({ state, dataset, dispatch, instant, prefs, onDismissNote }) {
  const announce = useAnnounce();
  const [openIdx, setOpenIdx] = useState(null);
  const [candidate, setCandidate] = useState(null);
  const [lastEmpty, setLastEmpty] = useState(false);
  const wasSpinning = useRef(false);
  const summary = useMemo(() => selectDraftSummary(state), [state]);
  const eraIndex = useMemo(() => selectEraIndex(dataset.index, state.eraMin, state.eraMax), [dataset.index, state.eraMin, state.eraMax]);
  const idx = nextEmptySlotIndex(state.assignments);
  const slot = idx >= 0 ? state.assignments[idx] : null;
  const { options, spinning } = state.draw;
  const open = openIdx !== null ? options[openIdx] : null;

  useEffect(() => { setOpenIdx(null); setCandidate(null); }, [options]);

  useEffect(() => {
    if (spinning) { wasSpinning.current = true; return; }
    if (!wasSpinning.current) return;
    wasSpinning.current = false;
    if (options.length === 0) {
      setLastEmpty(true);
      announce("Nobody left in those squads. Draw again.");
    } else {
      setLastEmpty(false);
      announce(`${options.length === 1 ? "One cutting" : `${options.length} cuttings`} drawn: ${options.map((o) => o.label).join(", ")}.`);
    }
  }, [spinning, options, announce]);

  const onLand = useCallback(() => dispatch({ type: "LAND" }), [dispatch]);
  const onRedraw = () => {
    announce("Redrawn.");
    dispatch({ type: "REDRAW" });
  };
  const pick = () => {
    const player = candidate;
    const position = (POSITION_LABEL[slot.type] ?? slot.type).toLowerCase();
    dispatch({ type: "PICK_PLAYER", player });
    setCandidate(null);
    setOpenIdx(null);
    announce(summary.picked + 1 >= 11 ? `${player.name} picked at ${position}. Your XI is complete.` : `${player.name} picked at ${position}. Pick ${summary.picked + 2} of 11.`);
  };

  return (
    <div className={styles.draft}>
      <div className={styles.board}>
        <Chalkboard assignments={state.assignments} bench={state.bench} mode="draft" activeSlotId={state.draftDone ? null : slot?.slotId ?? null} compact />
        <SquadStrip summary={summary} />
      </div>
      <div className={styles.content}>
        <CoachNote id="draft" prefs={prefs} onDismiss={onDismissNote} />
        {state.draftDone
          ? <TeamSheetSlip state={state} summary={summary} />
          : <Draw draw={{ ...state.draw, lastEmpty }} slotType={slot?.type} eraIndex={eraIndex} instant={instant} selected={openIdx}
            onDraw={() => dispatch({ type: "DRAW" })} onLand={onLand} onRedraw={onRedraw} onOpen={setOpenIdx} />}
      </div>
      <CuttingSheet option={open} slotType={slot?.type} onClose={() => setOpenIdx(null)} onChoose={setCandidate} />
      <ConfirmPick player={candidate} preview={candidate ? previewPick(state, candidate) : null} clubSeason={open?.label ?? ""}
        onClose={() => setCandidate(null)} onPick={pick} />
    </div>
  );
}
