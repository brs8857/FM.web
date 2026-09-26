import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { createReducer } from "../state/reducer.js";
import { makeInitialState } from "../state/initialState.js";
import { newCareerSeed } from "../state/rngState.js";
import { selectNextAction, liveAssignments, selectFamiliarity, selectProfile, tacticUntouched, selectSuspended } from "../state/selectors.js";
import { getStorage, readAutosave, clearAutosave, requestPersistentStorage, writeAutosave } from "../state/storage.js";
import { readPrefs } from "../state/prefs.js";
import { hydrateState, makeSaveEnvelope, toSaveText, describeSave } from "../state/save.js";
import { saveFileName, exportSaveText, readImportFile } from "../state/exportImport.js";
import { summarizeSeason } from "../state/reducer.js";
import { selectSeasonHistory } from "../state/selectors.js";
import { APP_VERSION } from "../version.js";
import { careerSeasonLabel } from "../engine/season.js";
import { cohesionLabel, identityLabel } from "../content/labels.js";
import { clubName as displayClubName, clubSeasonLabel } from "../content/clubs.js";
import { useAutosave } from "./useAutosave.js";
import { useNav, STEPS } from "./nav.js";
import { usePrefs, useReducedMotion } from "./usePrefs.js";
import { useDocumentPrefs } from "./useDocumentPrefs.js";
import { encodeCareerCode } from "./careerCode.js";
import { useShortcuts } from "./useShortcuts.js";
import Shell from "./Shell.jsx";
import ConfirmSheet from "./ConfirmSheet.jsx";
import FirstRun, { FIRST_RUN_NOTE } from "./FirstRun.jsx";
import Gallery from "../screens/_gallery/Gallery.jsx";
import Home from "../screens/Home/Home.jsx";
import Era from "../screens/NewCareer/Era.jsx";
import Formation from "../screens/NewCareer/Formation.jsx";
import Colours from "../screens/NewCareer/Colours.jsx";
import Draft from "../screens/Draft/Draft.jsx";
import SquadTab from "../screens/Squad/SquadTab.jsx";
import BoardTab from "../screens/Board/BoardTab.jsx";
import SeasonTab from "../screens/Season/SeasonTab.jsx";
import PlayToSheet from "../screens/Season/PlayToSheet.jsx";
import ClubTab from "../screens/Club/ClubTab.jsx";
import Settings from "../screens/Club/Settings.jsx";
import Saves from "../screens/Club/Saves.jsx";
import About from "../screens/Club/About.jsx";
import terms from "../content/terms.json";
import { t } from "../content/t.js";
import { TermsProvider } from "../ui/Term.jsx";
import LiveRegion from "../ui/LiveRegion.jsx";
import NextPill from "../ui/NextPill.jsx";
import Button from "../ui/Button.jsx";
import IconButton from "../ui/IconButton.jsx";
import Sheet from "../ui/Sheet.jsx";
import { HomeIcon } from "../ui/icons.jsx";
import styles from "./App.module.css";

const TITLES = { squad: "Squad", board: "Board", season: "Season", club: "Club" };

const SETUP_STEPS = {
  era: { subtitle: "1 of 3 · Era", next: "Choose a shape" },
  formation: { subtitle: "2 of 3 · Shape", next: "Choose your colours" },
  club: { subtitle: "3 of 3 · Colours", next: "Start the draft" },
};

// Next actions that are a single reducer action.
const NEXT_ACTIONS = {
  kickOff: { type: "START_SEASON" },
  startSeason: { type: "KICKOFF" },
  playMatch: { type: "PLAY_MATCH" },
  openWindow: { type: "GOTO_TRANSFER" },
  closeWindow: { type: "CONTINUE_SEASON" },
};

// The app: owns the reducer, autosave, navigation and preferences, and
// renders the screens inside the shell. `?gallery=1` shows the primitive
// gallery instead. `prefs` overrides what storage holds (tests).
export default function App({ dataset, storage: storageProp, prefs, search }) {
  const [storage] = useState(() => (storageProp !== undefined ? storageProp : getStorage()));
  const [query] = useState(() => new URLSearchParams(search ?? (typeof window === "undefined" ? "" : window.location.search)));
  const [initialPrefs] = useState(() => prefs ?? readPrefs(storage));
  if (query.get("gallery") === "1") return <Gallery />;
  return (
    <TermsProvider terms={terms}>
      <LiveRegion>
        <Game dataset={dataset} storageProp={storage} initialPrefs={initialPrefs} />
      </LiveRegion>
    </TermsProvider>
  );
}

// True until the phase first changes after a resume, so the reveal a player
// comes back to is shown instantly rather than replayed.
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
  const [pending, setPending] = useState(null); // { kind: "import", state } | { kind: "code", ...decoded }
  const [homeSheet, setHomeSheet] = useState(null);
  const [feed, setFeed] = useState(null);
  const [playTo, setPlayTo] = useState(false);
  const [resumed, setResumed] = useResumed(state.phase, boot.status === "ok");
  const clubName = useCallback((name) => displayClubName(name, prefs.clubNames), [prefs.clubNames]);
  const next = selectNextAction(state, clubName);
  const [nav, navDispatch] = useNav(state.phase, next.tab ?? "season");
  const persistRequested = useRef(false);
  const reducedMotion = useReducedMotion(prefs);
  const instant = resumed || reducedMotion;

  useDocumentPrefs(prefs);
  useAutosave({ state, storage, enabled: true, onWriteError: () => setNotice("unavailable") });

  const live = useMemo(() => liveAssignments(state.assignments), [state.assignments]);
  const familiarity = useMemo(() => selectFamiliarity(live, state.instructions, state.formationKey, state.cohesionMemory), [live, state.instructions, state.formationKey, state.cohesionMemory]);
  const profile = useMemo(() => selectProfile(live, state.instructions, familiarity), [live, state.instructions, familiarity]);
  const identity = identityLabel(profile.synergyLabel, state.instructions);
  const cohesion = cohesionLabel(familiarity);
  const clubSeason = useCallback((seasonKey) => clubSeasonLabel(dataset, seasonKey, prefs.clubNames), [dataset, prefs.clubNames]);
  const suspended = useMemo(() => new Set(selectSuspended(state).map((s) => s.id)), [state]);
  const revealed = state.phase === "reveal" || state.phase === "matchday" || state.phase === "result";
  const careerCode = encodeCareerCode({ seed: state.careerSeed, eraMin: state.eraMin, eraMax: state.eraMax, formationKey: state.formationKey });

  const inProgress = state.phase !== "formation";

  const startNewCareer = useCallback((seed = newCareerSeed(), setup = null) => {
    clearAutosave(storage);
    dispatch({ type: "NEW_GAME", seed });
    if (setup) {
      dispatch({ type: "SET_ERA", min: setup.eraMin, max: setup.eraMax });
      dispatch({ type: "SET_FORMATION", key: setup.formationKey });
    }
    setResumed(false);
    navDispatch({ type: "LEAVE_HOME" });
    setConfirmNew(false);
    setPending(null);
  }, [storage, navDispatch, setResumed]);

  const onNewCareer = () => {
    if (inProgress) setConfirmNew(true);
    else navDispatch({ type: "LEAVE_HOME" });
  };

  const onStartFromCode = (decoded) => {
    if (inProgress) setPending({ kind: "code", ...decoded });
    else startNewCareer(decoded.seed, decoded);
  };

  const loadCareer = useCallback((loaded) => {
    if (storage) writeAutosave(storage, toSaveText(makeSaveEnvelope(loaded, { gameVersion: APP_VERSION })));
    dispatch({ type: "LOAD_SAVE", state: loaded });
    setResumed(true);
    setPending(null);
    setHomeSheet(null);
    navDispatch({ type: "LEAVE_HOME" });
  }, [storage, navDispatch, setResumed]);

  const onImportFile = async (file) => {
    const result = await readImportFile(file);
    if (!result.ok) return { ok: false, message: result.reason };
    const loaded = hydrateState(result.save.state);
    const { season, seasonLabel } = describeSave(result.save);
    if (inProgress) { setPending({ kind: "import", state: loaded }); return { ok: true }; }
    loadCareer(loaded);
    return { ok: true, message: `Loaded season ${season} · ${seasonLabel}.` };
  };

  const exportCareer = () => exportSaveText(toSaveText(makeSaveEnvelope(state, { gameVersion: APP_VERSION })), saveFileName(state));

  const confirmPending = () => {
    if (pending?.kind === "import") loadCareer(pending.state);
    else if (pending?.kind === "code") startNewCareer(pending.seed, pending);
  };

  const startDraft = () => {
    if (!persistRequested.current) {
      persistRequested.current = true;
      requestPersistentStorage();
    }
    dispatch({ type: "START_DRAFT" });
  };

  const goTab = useCallback((tab) => navDispatch({ type: "TAB", tab }), [navDispatch]);
  const goNext = () => {
    const action = NEXT_ACTIONS[next.key];
    if (next.tab && next.tab !== nav.tab) goTab(next.tab);
    else if (action) dispatch(action);
  };

  // Fast-forward: the fixtures are played in one step and saved, then type
  // in on the vidiprinter from the first of them (instantly under reduced
  // motion).
  const runPlayTo = (until) => {
    if (until !== "next" && !reducedMotion) setFeed(state.campaign.week);
    dispatch({ type: "PLAY_TO", until });
    goTab("season");
  };
  const onFeedDone = useCallback(() => setFeed(null), []);

  const sticky = stickyFor();
  function stickyFor() {
    if (nav.mode !== "club" || feed != null) return null;
    if (state.phase === "tactics" && (nav.tab === "board" || nav.tab === "season")) {
      return { label: `Kick off season ${state.season}`, run: () => { dispatch({ type: "START_SEASON" }); goTab("season"); } };
    }
    if (next.key === "replaceSuspended" && nav.tab !== "squad" && nav.tab !== "club") return { label: next.label, run: () => goTab("squad") };
    if (next.key === "playMatch" && nav.tab !== "club") {
      return { label: next.label, run: () => { dispatch(NEXT_ACTIONS.playMatch); goTab("season"); }, playTo: true };
    }
    if (nav.tab !== next.tab) return null;
    if (next.key === "careerComplete") return { label: next.label, run: () => goTab("club") };
    const action = NEXT_ACTIONS[next.key];
    return action ? { label: next.label, run: () => dispatch(action) } : null;
  }

  const primary = () => {
    if (nav.mode === "setup") {
      const after = STEPS[STEPS.indexOf(nav.step) + 1];
      if (after) navDispatch({ type: "STEP", step: after }); else startDraft();
    }
    else if (nav.mode === "draft") { if (state.draftDone) dispatch({ type: "SKIP_TO_TACTICS" }); }
    else if (sticky) sticky.run();
    else if (feed == null) goNext();
  };
  const draw = () => {
    if (nav.mode === "draft" && !state.draftDone && !state.draw.spinning && state.draw.options.length === 0) dispatch({ type: "DRAW" });
  };
  useShortcuts({ enabled: !nav.home, onTab: nav.mode === "club" ? goTab : null, onPrimary: primary, onDraw: nav.mode === "draft" ? draw : null });

  if (nav.home && !inProgress && !prefs.seenNotes.includes(FIRST_RUN_NOTE)) {
    return (
      <Shell mode="home">
        <FirstRun onDone={() => { markSeen(FIRST_RUN_NOTE); navDispatch({ type: "LEAVE_HOME" }); }} />
      </Shell>
    );
  }

  if (nav.home) {
    return (
      <Shell mode="home">
        <Home state={state} next={next} identity={identity} cohesion={cohesion} notice={notice} prefs={prefs} onDismissNote={markSeen}
          onContinue={() => { navDispatch({ type: "LEAVE_HOME" }); if (next.tab) goTab(next.tab); }}
          onNewCareer={onNewCareer} onClub={() => { navDispatch({ type: "LEAVE_HOME" }); goTab("club"); }}
          onSaves={() => setHomeSheet("saves")} onSettings={() => setHomeSheet("settings")} onAbout={() => setHomeSheet("about")} />
        <ConfirmSheet open={confirmNew} title="Start a new career?" confirmLabel="Start over" onConfirm={() => startNewCareer()} onClose={() => setConfirmNew(false)}>
          <p>Your current career ({t("shell.season", { season: state.season, label: careerSeasonLabel(state.season) })}) will be replaced. Export it from the Club tab first if you want to keep it.</p>
        </ConfirmSheet>
        <ConfirmSheet open={Boolean(pending)} title="Replace your career with this save?" confirmLabel="Load the save" onConfirm={confirmPending} onClose={() => setPending(null)}>
          <p>Your current career ({t("shell.season", { season: state.season, label: careerSeasonLabel(state.season) })}) will be replaced.</p>
        </ConfirmSheet>
        <Sheet open={homeSheet === "saves"} onClose={() => setHomeSheet(null)} title="Saves">
          <Saves canExport={inProgress} storageAvailable={Boolean(storage)} onExport={exportCareer} onImportFile={onImportFile} />
        </Sheet>
        <Sheet open={homeSheet === "settings"} onClose={() => setHomeSheet(null)} title="Settings"><Settings prefs={prefs} setPrefs={setPrefs} /></Sheet>
        <Sheet open={homeSheet === "about"} onClose={() => setHomeSheet(null)} title="About"><About /></Sheet>
      </Shell>
    );
  }

  if (nav.mode === "setup") {
    const step = SETUP_STEPS[nav.step];
    return (
      <Shell mode="setup" title="New career" subtitle={step.subtitle} onBack={() => navDispatch({ type: "BACK" })}
        sticky={<Button block onClick={primary}>{step.next}</Button>}>
        {nav.step === "era" && <Era eraMin={state.eraMin} eraMax={state.eraMax} index={dataset.index} onSetEra={(min, max) => dispatch({ type: "SET_ERA", min, max })} />}
        {nav.step === "formation" && <Formation formationKey={state.formationKey} onPick={(key) => dispatch({ type: "SET_FORMATION", key })} />}
        {nav.step === "club" && <Colours club={prefs.club} mode={prefs.clubNames} onPick={(club) => setPrefs({ club })} />}
      </Shell>
    );
  }

  if (nav.mode === "draft") {
    return (
      <Shell mode="draft" title="Draft" subtitle={state.draftDone ? "XI complete" : `Pick ${next.pick} of 11`}
        end={<Button variant="ghost" size="sm" onClick={() => navDispatch({ type: "HOME" })}>Pause</Button>}
        sticky={state.draftDone ? <Button block onClick={() => dispatch({ type: "SKIP_TO_TACTICS" })}>Go to the board</Button> : undefined}>
        <Draft state={state} dataset={dataset} dispatch={dispatch} instant={reducedMotion} clubSeason={clubSeason} prefs={prefs} onDismissNote={markSeen} />
      </Shell>
    );
  }

  return (
    <Shell mode="club" tab={nav.tab} onTab={goTab}
      title={TITLES[nav.tab]} subtitle={t("shell.season", { season: state.season, label: careerSeasonLabel(state.season) })}
      start={<IconButton label="Home" onClick={() => navDispatch({ type: "HOME" })}><HomeIcon /></IconButton>}
      onBack={nav.history.length > 0 ? () => navDispatch({ type: "BACK" }) : undefined}
      next={feed == null ? <NextPill label={next.label} onClick={goNext} /> : undefined}
      sticky={sticky ? (
        <div className={styles.stickyRow}>
          <Button block onClick={sticky.run}>{sticky.label}</Button>
          {sticky.playTo && <Button variant="ghost" onClick={() => setPlayTo(true)}>{t("season.playTo")}</Button>}
        </div>
      ) : undefined}>
      {nav.tab === "squad" && <SquadTab state={state} dispatch={dispatch} clubSeason={clubSeason} revealed={revealed} suspended={suspended} prefs={prefs} onDismissNote={markSeen} />}
      {nav.tab === "board" && <BoardTab state={state} dispatch={dispatch} profile={profile} suspended={suspended} familiarity={familiarity} clubSeason={clubSeason} revealed={revealed} prefs={prefs} onDismissNote={markSeen} />}
      {nav.tab === "season" && (
        <SeasonTab state={state} dispatch={dispatch} identity={identity} familiarity={familiarity} profile={profile} tacticUntouched={tacticUntouched(state)}
          instant={reducedMotion} revealInstant={instant} feed={feed} onFeedDone={onFeedDone} careerCode={careerCode}
          clubSeason={clubSeason} clubName={clubName} prefs={prefs} onDismissNote={markSeen} onGoBoard={() => goTab("board")} onGoTab={goTab} />
      )}
      {nav.tab === "club" && (
        <ClubTab history={selectSeasonHistory(state, summarizeSeason)} careerComplete={next.key === "careerComplete"} careerCode={careerCode}
          prefs={prefs} setPrefs={setPrefs} onDismissNote={markSeen} canExport={inProgress} storageAvailable={Boolean(storage)}
          onExport={exportCareer} onImportFile={onImportFile} onStartFromCode={onStartFromCode} onNewCareer={onNewCareer} />
      )}
      {state.phase === "matchday" && state.campaign && (
        <PlayToSheet open={playTo} onClose={() => setPlayTo(false)} week={state.campaign.week} onPlay={runPlayTo} />
      )}
      <ConfirmSheet open={confirmNew} title="Start a new career?" confirmLabel="Start over" onConfirm={() => startNewCareer()} onClose={() => setConfirmNew(false)}>
        <p>Your current career ({t("shell.season", { season: state.season, label: careerSeasonLabel(state.season) })}) will be replaced. Export it first if you want to keep it.</p>
      </ConfirmSheet>
      <ConfirmSheet open={Boolean(pending)} title={pending?.kind === "import" ? "Replace your career with this save?" : "Start a career from this code?"}
        confirmLabel={pending?.kind === "import" ? "Load the save" : "Start over"} onConfirm={confirmPending} onClose={() => setPending(null)}>
        <p>Your current career ({t("shell.season", { season: state.season, label: careerSeasonLabel(state.season) })}) will be replaced.</p>
      </ConfirmSheet>
    </Shell>
  );
}
