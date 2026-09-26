import { useCallback } from "react";
import CoachNote from "../../app/CoachNote.jsx";
import { cx } from "../../ui/cx.js";
import { selectTable } from "../../state/selectors.js";
import Preseason from "./Preseason.jsx";
import TeamSheetReveal from "./TeamSheetReveal.jsx";
import MatchDay from "./MatchDay.jsx";
import Vidiprinter from "./Vidiprinter.jsx";
import BackPage from "./BackPage.jsx";
import Window from "./Window.jsx";
import styles from "./Season.module.css";

// The Season tab (spec 07 §7.1): pre-season, the reveal, match day, the
// back page and the window, one screen switching on the phase. `feed` is the
// first week of a fast-forward still typing in on the vidiprinter.
export default function SeasonTab({ state, dispatch, identity, familiarity, profile, tacticUntouched, instant, feed, onFeedDone, careerCode, clubSeason, clubName, prefs, onDismissNote, onGoBoard, onGoTab }) {
  const { campaign, opponents } = state;
  const standingAt = useCallback((week) => selectTable({ campaign, opponents }, week).find((r) => r.isUser), [campaign, opponents]);
  if (state.phase === "transfer") {
    return <Window state={state} dispatch={dispatch} clubSeason={clubSeason} clubName={clubName} prefs={prefs} onDismissNote={onDismissNote} />;
  }
  const feeding = feed != null && campaign && (state.phase === "matchday" || state.phase === "result");
  return (
    <div className={cx(styles.season, state.phase === "matchday" && !feeding && styles.wide)}>
      <CoachNote id="season" prefs={prefs} onDismiss={onDismissNote} />
      {state.phase === "tactics" && (
        <Preseason state={state} identity={identity} familiarity={familiarity} tacticUntouched={tacticUntouched} clubName={clubName} onGoBoard={onGoBoard} />
      )}
      {state.phase === "reveal" && campaign && (
        <TeamSheetReveal state={state} instant={instant} onKickoff={() => dispatch({ type: "KICKOFF" })} />
      )}
      {feeding && (
        <Vidiprinter log={campaign.log} from={feed} season={state.season} instant={instant} clubName={clubName} standingAt={standingAt} onDone={onFeedDone} />
      )}
      {state.phase === "matchday" && !feeding && (
        <MatchDay state={state} identity={identity} familiarity={familiarity} profile={profile} clubName={clubName} onGoTab={onGoTab} />
      )}
      {state.phase === "result" && state.simulation && !feeding && (
        <BackPage state={state} careerCode={careerCode} clubName={clubName} opponents={state.opponents} />
      )}
    </div>
  );
}
