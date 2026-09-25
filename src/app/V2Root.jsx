import { useMemo, useReducer, useState } from "react";
import { createReducer } from "../state/reducer.js";
import { makeInitialState } from "../state/initialState.js";
import { newCareerSeed } from "../state/rngState.js";
import { selectNextAction } from "../state/selectors.js";
import { getStorage, readAutosave } from "../state/storage.js";
import { hydrateState, describeSave } from "../state/save.js";
import { careerSeasonLabel } from "../engine/season.js";
import { useAutosave } from "./useAutosave.js";
import { useNav } from "./nav.js";
import { useDocumentPrefs } from "./useDocumentPrefs.js";
import Shell from "./Shell.jsx";
import Gallery from "../screens/_gallery/Gallery.jsx";
import terms from "../content/terms.json";
import { PRODUCT_NAME } from "../content/product.js";
import { t } from "../content/t.js";
import { TermsProvider } from "../ui/Term.jsx";
import LiveRegion from "../ui/LiveRegion.jsx";
import NextPill from "../ui/NextPill.jsx";
import Button from "../ui/Button.jsx";
import Slip from "../ui/Slip.jsx";

const TITLES = { setup: "New career", draft: "Draft", squad: "Squad", board: "Board", season: "Season", club: "Club" };

// Next actions that are a single reducer action. The rest (a draft pick,
// setting a tactic, the record) need their screens.
const NEXT_ACTIONS = {
  startDraft: { type: "START_DRAFT" },
  goToBoard: { type: "SKIP_TO_TACTICS" },
  kickOff: { type: "SIMULATE" },
  startSeason: { type: "KICKOFF" },
  openWindow: { type: "GOTO_TRANSFER" },
  closeWindow: { type: "CONTINUE_SEASON" },
};

// The v2 tree behind ?layout=v2. Owns the reducer and autosave like the v1
// app; the screens land in milestone B, so each panel is a placeholder that
// shows the phase and the next action.
export default function V2Root({ dataset, storage: storageProp, prefs, gallery = false }) {
  const [storage] = useState(() => (storageProp !== undefined ? storageProp : getStorage()));
  const [boot] = useState(() => (storage ? readAutosave(storage) : { status: "none" }));
  const reducer = useMemo(() => createReducer(dataset), [dataset]);
  const [state, dispatch] = useReducer(reducer, boot.status === "ok" ? boot.save.state : dataset,
    (init) => (boot.status === "ok" ? hydrateState(init) : makeInitialState(init, newCareerSeed())));
  const next = selectNextAction(state);
  const [nav, navDispatch] = useNav(state.phase, next.tab ?? "season");

  useDocumentPrefs(prefs);
  useAutosave({ state, storage, enabled: !gallery });

  if (gallery) return <Gallery />;

  const club = nav.mode === "club";
  const subtitle = club ? t("shell.season", { season: state.season, label: careerSeasonLabel(state.season) }) : PRODUCT_NAME;
  const action = NEXT_ACTIONS[next.key];
  const onNextTab = !next.tab || next.tab === nav.tab;
  const goNext = () => {
    if (!onNextTab) navDispatch({ type: "TAB", tab: next.tab });
    else if (action) dispatch(action);
  };

  return (
    <TermsProvider terms={terms}>
      <LiveRegion>
        <Shell mode={nav.mode} tab={nav.tab} onTab={(tab) => navDispatch({ type: "TAB", tab })}
          title={club ? TITLES[nav.tab] : TITLES[nav.mode]} subtitle={subtitle}
          onBack={nav.history.length > 0 ? () => navDispatch({ type: "BACK" }) : undefined}
          next={club ? <NextPill label={next.label} onClick={goNext} /> : undefined}
          sticky={action && onNextTab ? <Button block onClick={goNext}>{next.label}</Button> : undefined}>
          <Slip kicker={t("shell.preview", { product: PRODUCT_NAME })} title={club ? TITLES[nav.tab] : next.label}>
            <p>{boot.status === "ok" ? `Resumed ${describeSave(boot.save).phaseLabel.toLowerCase()}.` : "No saved career."} The screens for this tab arrive in milestone B.</p>
            <p>Phase: <span className="mono">{state.phase}</span> · Next: {next.label}</p>
          </Slip>
        </Shell>
      </LiveRegion>
    </TermsProvider>
  );
}
