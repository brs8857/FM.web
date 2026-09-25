import { useEffect, useReducer } from "react";

// UI navigation state (spec 04 §4.1). Never saved. `mode` follows the phase:
// set-up (formation), the draft flow, or Club with its four tabs. `sheet`
// is whichever bottom sheet is open, as { kind, id } or null.
export const TABS = [
  { key: "squad", label: "Squad" },
  { key: "board", label: "Board" },
  { key: "season", label: "Season" },
  { key: "club", label: "Club" },
];

export const TAB_KEYS = TABS.map((t) => t.key);

export function modeFor(phase) {
  if (phase === "formation") return "setup";
  if (phase === "draft") return "draft";
  return "club";
}

export function initialNav(phase, tab = "season") {
  return { mode: modeFor(phase), tab, sheet: null, history: [] };
}

export function navReducer(nav, action) {
  switch (action.type) {
    case "PHASE": {
      const mode = modeFor(action.phase);
      if (mode === nav.mode) return nav;
      return { ...nav, mode, sheet: null, history: [], tab: action.tab ?? nav.tab };
    }
    case "TAB": {
      if (!TAB_KEYS.includes(action.tab) || action.tab === nav.tab) return nav;
      return { ...nav, tab: action.tab, sheet: null, history: [...nav.history, nav.tab].slice(-10) };
    }
    case "BACK": {
      if (nav.sheet) return { ...nav, sheet: null };
      if (nav.history.length === 0) return nav;
      const history = nav.history.slice(0, -1);
      return { ...nav, tab: nav.history[nav.history.length - 1], history };
    }
    case "OPEN_SHEET":
      return { ...nav, sheet: action.sheet };
    case "CLOSE_SHEET":
      return nav.sheet ? { ...nav, sheet: null } : nav;
    default:
      return nav;
  }
}

export function useNav(phase, defaultTab) {
  const [nav, dispatch] = useReducer(navReducer, phase, (p) => initialNav(p, defaultTab));
  useEffect(() => {
    dispatch({ type: "PHASE", phase, tab: defaultTab });
  }, [phase, defaultTab]);
  return [nav, dispatch];
}
