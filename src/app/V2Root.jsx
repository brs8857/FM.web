import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { createReducer } from "../state/reducer.js";
import { makeInitialState } from "../state/initialState.js";
import { newCareerSeed } from "../state/rngState.js";
import { selectNextAction, liveAssignments, selectFamiliarity, selectProfile, tacticUntouched } from "../state/selectors.js";
import { getStorage, readAutosave, clearAutosave, requestPersistentStorage } from "../state/storage.js";
import { hydrateState } from "../state/save.js";
import { careerSeasonLabel } from "../engine/season.js";
import { cohesionLabel, identityLabel } from "../content/labels.js";
import { clubSeasonLabel } from "../content/clubs.js";
import { useAutosave } from "./useAutosave.js";
import { useNav } from "./nav.js";
import { usePrefs, useReducedMotion } from "./usePrefs.js";
import { useDocumentPrefs } from "./useDocumentPrefs.js";
import { encodeCareerCode } from "./careerCode.js";
import Shell from "./Shell.jsx";
import ConfirmSheet from "./ConfirmSheet.jsx";
import Gallery from "../screens/_gallery/Gallery.jsx";
import Home from "../screens/Home/Home.jsx";
import Era from "../screens/NewCareer/Era.jsx";
import Formation from "../screens/NewCareer/Formation.jsx";
import Draft from "../screens/Draft/Draft.jsx";
import SquadTab from "../screens/Squad/SquadTab.jsx";
import BoardTab from "../screens/Board/BoardTab.jsx";
import SeasonTab from "../screens/Season/SeasonTab.jsx";
import Settings from "../screens/Club/Settings.jsx";
import About from "../screens/Club/About.jsx";
import terms from "../content/terms.json";
import { PRODUCT_NAME } from "../content/product.js";
import { t } from "../content/t.js";
import { TermsProvider } from "../ui/Term.jsx";
import LiveRegion from "../ui/LiveRegion.jsx";
import NextPill from "../ui/NextPill.jsx";
import Button from "../ui/Button.jsx";
import IconButton from "../ui/IconButton.jsx";
import Sheet from "../ui/Sheet.jsx";
import Slip from "../ui/Slip.jsx";
import { HomeIcon } from "../ui/icons.jsx";

const TITLES = { squad: "Squad", board: "Board", season: "Season", club: "Club" };

// Next actions that are a single reducer action.
const NEXT_ACTIONS = {
  kickOff: { type: "SIMULATE" },
  startSeason: { type: "KICKOFF" },
  openWindow: { type: "GOTO_TRANSFER" },
  closeWindow: { type: "CONTINUE_SEASON" },
};

export default function V2Root({ dataset, storage: storageProp, prefs: initialPrefs, gallery = false }) {
  if (gallery) return <Gallery />;
  return (
    <TermsProvider terms={terms}>
      <LiveRegion>
        <Game dataset={dataset} storageProp={storageProp} initialPrefs={initialPrefs} />
      </LiveRegion>
    </TermsProvider>
  );
}

// True until the phase first changes after a resume, so the reveal and the
// vidiprinter a player comes back to are shown instantly rather than replayed.
function useResumed(phase, initially) {
  const [resumed, setResumed] = useState(initially);
  const seen = useRef(phase);
  useEffect(() => {
    if (seen.current !== phase) { seen.current = phase; setResumed(false); }
  }, [phase]);
  return [resumed, setResumed];
}

function Game({ dataset, storageProp, initialPrefs }) {
  const [storage] = useState(() => (storageProp !== undefined ? storageProp : getStorage()));
  const [boot] = useState(() => (storage ? readAutosave(storage) : { status: "none" }));
  const reducer = useMemo(() => createReducer(dataset), [dataset]);
  const [state, dispatch] = useReducer(reducer, boot.status === "ok" ? boot.save.state : dataset,
    (init) => (boot.status === "ok" ? hydrateState(init) : makeInitialState(init, newCareerSeed())));
  const [prefs, setPrefs, markSeen] = usePrefs(storage, initialPrefs);
  const [notice, setNotice] = useState(boot.status === "corrupt" ? "corrupt" : storage ? null : "unavailable");
  const [confirmNew, setConfirmNew] = useState(false);
  const [homeSheet, setHomeSheet] = useState(null);
  const [feedDoneSeason, setFeedDoneSeason] = useState(null);
  const [resumed, setResumed] = useResumed(state.phase, boot.status === "ok");
  const next = selectNextAction(state);
  const [nav, navDispatch] = useNav(state.phase, next.tab ?? "season");
  const persistRequested = useRef(false);
  const reducedMotion = useReducedMotion(prefs);
  const instant = resumed || reducedMotion;

  useDocumentPrefs(prefs);
  useAutosave({ state, storage, enabled: true, onWriteError: () => setNotice("unavailable") });

  const live = useMemo(() => liveAssignments(state.assignments), [state.assignments]);
  const familiarity = useMemo(() => selectFamiliarity(live, state.instructions, state.formationKey), [live, state.instructions, state.formationKey]);
  const profile = useMemo(() => selectProfile(live, state.instructions, familiarity), [live, state.instructions, familiarity]);
  const identity = identityLabel(profile.synergyLabel, state.instructions);
  const cohesion = cohesionLabel(familiarity);
  const clubSeason = useCallback((seasonKey) => clubSeasonLabel(dataset, seasonKey), [dataset]);
  const clubName = useCallback((name) => name, []);
  const revealed = state.phase === "reveal" || state.phase === "result";
  const careerCode = encodeCareerCode({ seed: state.careerSeed, eraMin: state.eraMin, eraMax: state.eraMax, formationKey: state.formationKey });
  const feedDone = state.phase === "result" && (instant || feedDoneSeason === state.season);

  const startNewCareer = useCallback(() => {
    clearAutosave(storage);
    dispatch({ type: "NEW_GAME", seed: newCareerSeed() });
    setResumed(false);
    navDispatch({ type: "LEAVE_HOME" });
    setConfirmNew(false);
  }, [storage, navDispatch, setResumed]);

  const onNewCareer = () => {
    if (state.phase === "formation") navDispatch({ type: "LEAVE_HOME" });
    else setConfirmNew(true);
  };

  const startDraft = () => {
    if (!persistRequested.current) {
      persistRequested.current = true;
      requestPersistentStorage();
    }
    dispatch({ type: "START_DRAFT" });
  };

  const goTab = (tab) => navDispatch({ type: "TAB", tab });
  const goNext = () => {
    const action = NEXT_ACTIONS[next.key];
    if (next.tab && next.tab !== nav.tab) goTab(next.tab);
    else if (action) dispatch(action);
  };

  if (nav.home) {
    return (
      <Shell mode="home">
        <Home state={state} next={next} identity={identity} cohesion={cohesion} notice={notice} prefs={prefs} onDismissNote={markSeen}
          onContinue={() => { navDispatch({ type: "LEAVE_HOME" }); if (next.tab) goTab(next.tab); }}
          onNewCareer={onNewCareer} onClub={() => { navDispatch({ type: "LEAVE_HOME" }); goTab("club"); }}
          onSettings={() => setHomeSheet("settings")} onAbout={() => setHomeSheet("about")} />
        <ConfirmSheet open={confirmNew} title="Start a new career?" confirmLabel="Start over" onConfirm={startNewCareer} onClose={() => setConfirmNew(false)}>
          <p>Your current career ({t("shell.season", { season: state.season, label: careerSeasonLabel(state.season) })}) will be replaced. Export it from the Club tab first if you want to keep it.</p>
        </ConfirmSheet>
        <Sheet open={homeSheet === "settings"} onClose={() => setHomeSheet(null)} title="Settings"><Settings prefs={prefs} setPrefs={setPrefs} /></Sheet>
        <Sheet open={homeSheet === "about"} onClose={() => setHomeSheet(null)} title="About"><About /></Sheet>
      </Shell>
    );
  }

  if (nav.mode === "setup") {
    const era = nav.step === "era";
    return (
      <Shell mode="setup" title="New career" subtitle={era ? "1 of 2 · Era" : "2 of 2 · Shape"} onBack={() => navDispatch({ type: "BACK" })}
        sticky={era
          ? <Button block onClick={() => navDispatch({ type: "STEP", step: "formation" })}>Choose a shape</Button>
          : <Button block onClick={startDraft}>Start the draft</Button>}>
        {era
          ? <Era eraMin={state.eraMin} eraMax={state.eraMax} index={dataset.index} onSetEra={(min, max) => dispatch({ type: "SET_ERA", min, max })} />
          : <Formation formationKey={state.formationKey} onPick={(key) => dispatch({ type: "SET_FORMATION", key })} />}
      </Shell>
    );
  }

  if (nav.mode === "draft") {
    return (
      <Shell mode="draft" title="Draft" subtitle={state.draftDone ? "XI complete" : `Pick ${next.pick} of 11`}
        end={<Button variant="ghost" size="sm" onClick={() => navDispatch({ type: "HOME" })}>Pause</Button>}
        sticky={state.draftDone ? <Button block onClick={() => dispatch({ type: "SKIP_TO_TACTICS" })}>Go to the board</Button> : undefined}>
        <Draft state={state} dataset={dataset} dispatch={dispatch} instant={reducedMotion} prefs={prefs} onDismissNote={markSeen} />
      </Shell>
    );
  }

  const sticky = stickyFor();
  function stickyFor() {
    if (state.phase === "tactics" && (nav.tab === "board" || nav.tab === "season")) {
      return { label: `Kick off season ${state.season}`, run: () => { dispatch({ type: "SIMULATE" }); goTab("season"); } };
    }
    if (nav.tab !== next.tab) return null;
    if (state.phase === "result") {
      if (!feedDone) return null;
      if (next.key === "careerComplete") return { label: next.label, run: () => goTab("club") };
    }
    const action = NEXT_ACTIONS[next.key];
    return action ? { label: next.label, run: () => dispatch(action) } : null;
  }

  return (
    <Shell mode="club" tab={nav.tab} onTab={goTab}
      title={TITLES[nav.tab]} subtitle={t("shell.season", { season: state.season, label: careerSeasonLabel(state.season) })}
      start={<IconButton label="Home" onClick={() => navDispatch({ type: "HOME" })}><HomeIcon /></IconButton>}
      onBack={nav.history.length > 0 ? () => navDispatch({ type: "BACK" }) : undefined}
      next={<NextPill label={next.label} onClick={goNext} />}
      sticky={sticky ? <Button block onClick={sticky.run}>{sticky.label}</Button> : undefined}>
      {nav.tab === "squad" && <SquadTab state={state} dispatch={dispatch} clubSeason={clubSeason} revealed={revealed} prefs={prefs} onDismissNote={markSeen} />}
      {nav.tab === "board" && <BoardTab state={state} dispatch={dispatch} profile={profile} familiarity={familiarity} clubSeason={clubSeason} revealed={revealed} prefs={prefs} onDismissNote={markSeen} />}
      {nav.tab === "season" && (
        <SeasonTab state={state} dispatch={dispatch} identity={identity} familiarity={familiarity} tacticUntouched={tacticUntouched(state)}
          instant={instant} feedDone={feedDone} onFeedDone={() => setFeedDoneSeason(state.season)} careerCode={careerCode}
          clubSeason={clubSeason} clubName={clubName} prefs={prefs} onDismissNote={markSeen} onGoBoard={() => goTab("board")} />
      )}
      {nav.tab === "club" && (
        <Slip kicker={PRODUCT_NAME} title="Club">
          <p>Phase: <span className="mono">{state.phase}</span> · Next: {next.label}</p>
        </Slip>
      )}
    </Shell>
  );
}
