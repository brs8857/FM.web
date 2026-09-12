import React, { useReducer, useMemo, useState, useEffect, useRef } from "react";
import { SLOT_TYPE_LABEL } from "./engine/formations.js";
import { careerSeasonLabel } from "./engine/season.js";
import { nextEmptySlotIndex } from "./engine/squad.js";
import { createReducer } from "./state/reducer.js";
import { makeInitialState } from "./state/initialState.js";
import { newCareerSeed } from "./state/rngState.js";
import { selectEraIndex, liveAssignments, selectFamiliarity, selectProfile } from "./state/selectors.js";
import { getStorage, readAutosave, clearAutosave, requestPersistentStorage, writeAutosave } from "./state/storage.js";
import { useAutosave } from "./components/app/useAutosave.js";
import { hydrateState, describeSave, makeSaveEnvelope, toSaveText } from "./state/save.js";
import { saveFileName, exportSaveText, readImportFile } from "./state/exportImport.js";
import { APP_VERSION } from "./version.js";
import ResumeCard from "./components/app/ResumeCard.jsx";
import StorageBanner from "./components/app/StorageBanner.jsx";
import SaveMenu from "./components/app/SaveMenu.jsx";
import { usePitchDrag } from "./components/pitch/usePitchDrag.js";
import FormationSelect from "./components/screens/FormationSelect.jsx";
import DraftScreen from "./components/screens/DraftScreen.jsx";
import TacticsScreen from "./components/screens/TacticsScreen.jsx";
import ResultCard from "./components/screens/ResultCard.jsx";
import TransferScreen from "./components/screens/TransferScreen.jsx";
import RatingsRevealScreen from "./components/screens/RatingsRevealScreen.jsx";

/* =================================== App ==================================== */
export default function FMWeb({ dataset, storage: storageProp }) {
  const [storage] = useState(() => (storageProp !== undefined ? storageProp : getStorage()));
  const [boot] = useState(() => (storage ? readAutosave(storage) : { status: "none" }));
  const reducer = useMemo(() => createReducer(dataset), [dataset]);
  const [state, dispatch] = useReducer(reducer, dataset, (ds) => makeInitialState(ds, newCareerSeed()));
  const [pendingSave, setPendingSave] = useState(boot.status === "ok" ? boot.save : null);
  const [notice, setNotice] = useState(boot.status === "corrupt" ? "corrupt" : storage ? null : "unavailable");
  const [resumed, setResumed] = useState(false);
  const shownPhase = useRef(state.phase);
  const persistRequested = useRef(false);

  useAutosave({ state, storage, enabled: !pendingSave, onWriteError: () => setNotice("unavailable") });

  useEffect(() => {
    if (shownPhase.current !== state.phase) {
      shownPhase.current = state.phase;
      setResumed(false);
    }
  }, [state.phase]);

  const loadCareer = (loaded) => {
    shownPhase.current = loaded.phase;
    setPendingSave(null);
    setResumed(true);
    dispatch({ type: "LOAD_SAVE", state: loaded });
  };

  const confirmReplaceSave = () => {
    if (!pendingSave) return true;
    const { season, seasonLabel } = describeSave(pendingSave);
    if (!window.confirm(`Start a new career? Your saved career (Season ${season} · ${seasonLabel}) will be replaced.`)) return false;
    clearAutosave(storage);
    setPendingSave(null);
    return true;
  };

  const startDraft = () => {
    if (!confirmReplaceSave()) return;
    if (!persistRequested.current) {
      persistRequested.current = true;
      requestPersistentStorage();
    }
    dispatch({ type: "START_DRAFT" });
  };

  const newGame = () => {
    if (!window.confirm("Start a new career? Your current career will be replaced.")) return;
    clearAutosave(storage);
    setResumed(false);
    dispatch({ type: "NEW_GAME", seed: newCareerSeed() });
  };

  const exportCareer = () => {
    exportSaveText(toSaveText(makeSaveEnvelope(state, { gameVersion: APP_VERSION })), saveFileName(state));
  };

  const importCareer = async (file) => {
    const result = await readImportFile(file);
    if (!result.ok) return result;
    const hasCareer = state.phase !== "formation" || pendingSave;
    const currentSeason = pendingSave ? pendingSave.state.season : state.season;
    if (hasCareer && !window.confirm(`Replace your current career (Season ${currentSeason})?`)) return { ok: false };
    const loaded = hydrateState(result.save.state);
    if (storage) writeAutosave(storage, toSaveText(makeSaveEnvelope(loaded, { gameVersion: APP_VERSION })));
    loadCareer(loaded);
    const { season, seasonLabel } = describeSave(result.save);
    return { ok: true, message: `Loaded Season ${season} · ${seasonLabel}.` };
  };
  const { phase, formationKey, assignments, bench, draftedIds, wheel, pool, instructions } = state;
  const { dragInfo, startDrag } = usePitchDrag({ assignments, dispatch });
  const [activeSlotId, setActiveSlotId] = useState(null);

  const nextIdx = nextEmptySlotIndex(assignments);
  const draftTargetSlotId = nextIdx >= 0 ? assignments[nextIdx].slotId : null;
  const draftTargetLabel = nextIdx >= 0 ? SLOT_TYPE_LABEL[assignments[nextIdx].type] : "";
  const draftComplete = nextIdx === -1;

  const live = useMemo(() => liveAssignments(assignments), [assignments]);
  const familiarity = useMemo(() => selectFamiliarity(live, instructions, formationKey), [live, instructions, formationKey]);
  const profile = useMemo(() => selectProfile(live, instructions, familiarity), [live, instructions, familiarity]);
  const eraIndex = useMemo(() => selectEraIndex(dataset.index, state.eraMin, state.eraMax), [dataset, state.eraMin, state.eraMax]);

  return (
    <div className="fmweb-root min-h-screen w-full text-neutral-100" style={{
      fontFamily: "'Inter', ui-sans-serif, system-ui",
      background: "linear-gradient(180deg, #0c1310 0%, #090d0b 55%, #07100c 100%)",
    }}>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <header className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div style={{ width: "3px", height: "36px", background: "#c9a227" }} />
            <div>
              <div className="text-xs uppercase font-bold text-amber-500" style={{ letterSpacing: "0.3em" }}>Premier League · 1992 – 2025</div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">FM<span className="text-emerald-500">.WEB</span></h1>
              <div className="text-xs text-neutral-500 font-semibold -mt-0.5 uppercase tracking-wide">Football Manager, in your browser</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center text-xs uppercase font-bold tracking-wide">
              {state.season === 1 && phase !== "transfer" && phase !== "reveal" ? (
                ["formation", "draft", "tactics", "result"].map((p, i) => {
                  const order = ["formation", "draft", "tactics", "result"];
                  const currentIdx = order.indexOf(phase);
                  const thisIdx = order.indexOf(p);
                  const done = thisIdx < currentIdx;
                  const active = thisIdx === currentIdx;
                  return (
                    <div key={p} className="flex items-center">
                      {i > 0 && <div className={`w-4 h-px ${done || active ? "bg-emerald-600" : "bg-neutral-800"}`} />}
                      <div className={`px-2.5 py-1 rounded border ${active ? "bg-emerald-600 text-white border-emerald-600" : done ? "border-emerald-800 text-emerald-600" : "border-neutral-800 text-neutral-600"}`}>{p}</div>
                    </div>
                  );
                })
              ) : (
                <div className="px-3 py-1.5 rounded border border-emerald-800 text-emerald-500">
                  Season {state.season} · {careerSeasonLabel(state.season)}{phase === "transfer" ? " · Transfer Window" : phase === "reveal" ? " · Squad Reveal" : ""}
                </div>
              )}
            </div>
            <SaveMenu canExport={phase !== "formation"} onExport={exportCareer} onImportFile={importCareer} version={APP_VERSION} />
          </div>
        </header>

        {notice && <StorageBanner kind={notice} onDismiss={() => setNotice(null)} />}
        {phase === "formation" && pendingSave && (
          <ResumeCard summary={describeSave(pendingSave)} onContinue={() => loadCareer(hydrateState(pendingSave.state))} onNewGame={confirmReplaceSave} />
        )}

        <div key={phase} className="fmweb-phase">
        {phase === "formation" && (
          <FormationSelect formationKey={formationKey} onPick={(k) => dispatch({ type: "SET_FORMATION", key: k })}
            onStart={startDraft} assignments={assignments}
            eraMin={state.eraMin} eraMax={state.eraMax} onSetEra={(mn, mx) => dispatch({ type: "SET_ERA", min: mn, max: mx })} />
        )}

        {phase === "draft" && (
          <DraftScreen formationKey={formationKey} assignments={assignments} bench={bench} wheel={wheel} pool={pool}
            draftTargetSlotId={draftTargetSlotId} draftTargetLabel={draftTargetLabel} draftComplete={draftComplete}
            eraMin={state.eraMin} eraMax={state.eraMax} eraIndex={eraIndex}
            onSpin={() => dispatch({ type: "SPIN" })}
            onDoneSpin={() => dispatch({ type: "LAND" })}
            onPick={(p) => dispatch({ type: "PICK_PLAYER", player: p })}
            onGotoTactics={() => dispatch({ type: "SKIP_TO_TACTICS" })}
          />
        )}

        {phase === "tactics" && (
          <TacticsScreen state={state} dispatch={dispatch} activeSlotId={activeSlotId}
            onSelectSlot={(id) => setActiveSlotId(id === activeSlotId ? null : id)}
            dragInfo={dragInfo} onDragStart={startDrag} profile={profile} familiarity={familiarity} />
        )}

        {phase === "transfer" && (
          <TransferScreen shortlist={state.shortlist} assignments={assignments} season={state.season} lastTransition={state.lastTransition}
            onSignBench={(index) => dispatch({ type: "SIGN_SHORTLIST_TO_BENCH", index })}
            onSignXI={(index, slotId) => dispatch({ type: "SIGN_SHORTLIST_TO_XI", index, slotId })}
            onContinue={() => dispatch({ type: "CONTINUE_SEASON" })} />
        )}

        {phase === "reveal" && state.simulation && (
          <RatingsRevealScreen assignments={assignments} season={state.season} onKickoff={() => dispatch({ type: "KICKOFF" })} instant={resumed} />
        )}

        {phase === "result" && state.simulation && (
          <ResultCard simulation={state.simulation} formationKey={formationKey} assignments={assignments}
            onReset={newGame} onContinue={() => dispatch({ type: "GOTO_TRANSFER" })} instant={resumed} />
        )}
        </div>
      </div>
    </div>
  );
}
