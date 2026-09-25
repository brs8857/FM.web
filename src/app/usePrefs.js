import { useCallback, useState } from "react";
import { writePrefs } from "../state/prefs.js";
import { useMediaQuery } from "./useMediaQuery.js";

// Per-device preferences, written through to storage on every change.
export function usePrefs(storage, initial) {
  const [prefs, setState] = useState(initial);
  const setPrefs = useCallback((patch) => {
    setState((current) => writePrefs(storage, { ...current, ...(typeof patch === "function" ? patch(current) : patch) }));
  }, [storage]);
  const markSeen = useCallback((note) => {
    setPrefs((current) => (current.seenNotes.includes(note) ? {} : { seenNotes: [...current.seenNotes, note] }));
  }, [setPrefs]);
  return [prefs, setPrefs, markSeen];
}

// Whether motion should be instant: the preference when set, else the system.
export function useReducedMotion(prefs) {
  const system = useMediaQuery("(prefers-reduced-motion: reduce)");
  return prefs.reduceMotion === "system" ? system : prefs.reduceMotion === "on";
}
