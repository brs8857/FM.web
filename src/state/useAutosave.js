// eslint-disable-next-line no-restricted-imports -- useAutosave is a React hook; it belongs beside the storage/save modules it wraps.
import { useCallback, useEffect, useRef } from "react";
import { makeSaveEnvelope, serializeState, toSaveText } from "./save.js";
import { writeAutosave } from "./storage.js";
import { APP_VERSION } from "../version.js";

export function useAutosave({ state, storage, enabled, onWriteError, delayMs = 500 }) {
  const lastWritten = useRef(null);
  const lastPhase = useRef(state.phase);
  const latest = useRef(state);
  const onErrorRef = useRef(onWriteError);

  useEffect(() => {
    latest.current = state;
    onErrorRef.current = onWriteError;
  });

  const persist = useCallback((current) => {
    const stateText = JSON.stringify(serializeState(current));
    if (stateText === lastWritten.current) return;
    const ok = writeAutosave(storage, toSaveText(makeSaveEnvelope(current, { gameVersion: APP_VERSION })));
    if (ok) lastWritten.current = stateText;
    else onErrorRef.current?.();
  }, [storage]);

  useEffect(() => {
    const phaseChanged = lastPhase.current !== state.phase;
    lastPhase.current = state.phase;
    if (!enabled || !storage || state.phase === "formation") return undefined;
    if (phaseChanged) {
      persist(state);
      return undefined;
    }
    const timer = setTimeout(() => persist(latest.current), delayMs);
    return () => clearTimeout(timer);
  }, [state, storage, enabled, delayMs, persist]);

  useEffect(() => {
    if (!enabled || !storage) return undefined;
    const flush = () => {
      if (latest.current.phase !== "formation") persist(latest.current);
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [enabled, storage, persist]);
}
