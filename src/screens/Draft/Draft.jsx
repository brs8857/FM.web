import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Chalkboard from "../../pitch/Chalkboard.jsx";
import CoachNote from "../../app/CoachNote.jsx";
import { useMediaQuery } from "../../app/useMediaQuery.js";
import { useAnnounce } from "../../ui/LiveRegion.jsx";
import { selectDraftSummary, selectArchive, selectEraIndex, previewPick, selectDraftStage, selectBenchSummary } from "../../state/selectors.js";
import { nextEmptySlotIndex, BENCH_SIZE } from "../../engine/squad.js";
import { POSITION_LABEL } from "../../content/labels.js";
import SquadStrip from "./SquadStrip.jsx";
import Draw from "./Draw.jsx";
import CuttingSheet from "./CuttingSheet.jsx";
import ConfirmPick from "./ConfirmPick.jsx";
import TeamSheetSlip from "./TeamSheetSlip.jsx";
import styles from "./Draft.module.css";

const TWO_COLUMNS = "(min-width: 600px)";

// On a phone the strip follows the draw, so the board and all three cuttings
// fit one screen at every pick (spec 04 §12).
export default function Draft({ state, dataset, dispatch, instant, clubSeason, prefs, onDismissNote }) {
  const announce = useAnnounce();
  const twoColumns = useMediaQuery(TWO_COLUMNS);
  const [openIdx, setOpenIdx] = useState(null);
  const [candidate, setCandidate] = useState(null);
  const [lastEmpty, setLastEmpty] = useState(false);
  const wasSpinning = useRef(false);
  const summary = useMemo(() => selectDraftSummary(state), [state]);
  const stage = selectDraftStage(state);
  const benchStage = stage === "bench";
  const bench = useMemo(() => (stage === "xi" ? null : selectBenchSummary(state)), [stage, state]);
  const benchPick = Math.min(BENCH_SIZE, state.bench.length + 1);
  const eraIndex = useMemo(() => selectEraIndex(selectArchive(dataset, state.league), state.eraMin, state.eraMax).map((e) => ({ ...e, label: clubSeason(`${e.y}_${e.c}`) })),
    [dataset, state.league, state.eraMin, state.eraMax, clubSeason]);
  const idx = nextEmptySlotIndex(state.assignments);
  const slot = idx >= 0 ? state.assignments[idx] : null;
  const { options, spinning } = state.draw;
  const open = openIdx !== null ? options[openIdx] : null;
  const labelFor = (o) => clubSeason(`${o.year}_${o.clubId}`);

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
      announce(`${options.length === 1 ? "One cutting" : `${options.length} cuttings`} drawn: ${options.map((o) => clubSeason(`${o.year}_${o.clubId}`)).join(", ")}.`);
    }
  }, [spinning, options, announce, clubSeason]);

  const onLand = useCallback(() => dispatch({ type: "LAND" }), [dispatch]);
  const onRedraw = () => {
    announce("Redrawn.");
    dispatch({ type: "REDRAW" });
  };
  const pick = () => {
    const player = candidate;
    dispatch({ type: "PICK_PLAYER", player });
    setCandidate(null);
    setOpenIdx(null);
    if (benchStage) {
      announce(benchPick >= BENCH_SIZE ? `${player.name} joins the bench. The squad is complete.` : `${player.name} joins the bench. Bench pick ${benchPick + 1} of ${BENCH_SIZE}.`);
      return;
    }
    const position = (POSITION_LABEL[slot.type] ?? slot.type).toLowerCase();
    announce(summary.picked + 1 >= 11 ? `${player.name} picked at ${position}. Your XI is complete; now ten for the bench.` : `${player.name} picked at ${position}. Pick ${summary.picked + 2} of 11.`);
  };
  const onFill = () => {
    dispatch({ type: "FILL_BENCH" });
    announce("Bench filled. The squad is complete.");
  };

  return (
    <div className={styles.draft}>
      <div className={styles.board}>
        <Chalkboard assignments={state.assignments} bench={state.bench} mode="draft" activeSlotId={stage === "xi" ? slot?.slotId ?? null : null} compact />
        {twoColumns && <SquadStrip summary={summary} bench={bench} />}
      </div>
      <div className={styles.content}>
        {state.draftDone
          ? <TeamSheetSlip state={state} summary={summary} />
          : <Draw draw={{ ...state.draw, lastEmpty }} slotType={slot?.type} benchPick={benchStage ? benchPick : null} eraIndex={eraIndex} instant={instant} selected={openIdx} labelFor={labelFor}
            onDraw={() => dispatch({ type: "DRAW" })} onLand={onLand} onRedraw={onRedraw} onOpen={setOpenIdx} onFill={onFill} />}
        {!twoColumns && <SquadStrip summary={summary} bench={bench} />}
        <CoachNote id={benchStage ? "bench" : "draft"} prefs={prefs} onDismiss={onDismissNote} />
      </div>
      <CuttingSheet option={open} title={open ? labelFor(open) : ""} slotType={slot?.type} bench={benchStage} onClose={() => setOpenIdx(null)} onChoose={setCandidate} />
      <ConfirmPick player={candidate} bench={benchStage} preview={candidate && !benchStage ? previewPick(state, candidate) : null} clubSeason={open ? labelFor(open) : ""}
        onClose={() => setCandidate(null)} onPick={pick} />
    </div>
  );
}
