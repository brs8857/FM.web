import CoachNote from "../../app/CoachNote.jsx";
import Preseason from "./Preseason.jsx";
import TeamSheetReveal from "./TeamSheetReveal.jsx";
import Vidiprinter from "./Vidiprinter.jsx";
import BackPage from "./BackPage.jsx";
import Window from "./Window.jsx";
import styles from "./Season.module.css";

// The Season tab (spec 04 §5.5): pre-season, the reveal, the vidiprinter,
// the back page, and the window, one screen switching on the phase.
export default function SeasonTab({ state, dispatch, identity, familiarity, tacticUntouched, instant, feedDone, onFeedDone, careerCode, clubSeason, clubName, prefs, onDismissNote, onGoBoard }) {
  if (state.phase === "transfer") {
    return <Window state={state} dispatch={dispatch} clubSeason={clubSeason} clubName={clubName} prefs={prefs} onDismissNote={onDismissNote} />;
  }
  return (
    <div className={styles.season}>
      <CoachNote id="season" prefs={prefs} onDismiss={onDismissNote} />
      {state.phase === "tactics" && (
        <Preseason state={state} identity={identity} familiarity={familiarity} tacticUntouched={tacticUntouched} clubName={clubName} onGoBoard={onGoBoard} />
      )}
      {state.phase === "reveal" && state.simulation && (
        <TeamSheetReveal state={state} instant={instant} onKickoff={() => dispatch({ type: "KICKOFF" })} />
      )}
      {state.phase === "result" && state.simulation && !feedDone && (
        <Vidiprinter simulation={state.simulation} season={state.season} instant={instant} clubName={clubName} onDone={onFeedDone} />
      )}
      {state.phase === "result" && state.simulation && feedDone && (
        <BackPage state={state} careerCode={careerCode} clubName={clubName} opponents={state.opponents} />
      )}
    </div>
  );
}
