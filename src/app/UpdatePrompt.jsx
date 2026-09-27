import { useEffect, useRef, useState } from "react";
import Toast from "../ui/Toast.jsx";

// A new version that is ready while the app is still opening (a worker left
// waiting from the last visit is found at once) is applied then, before
// anything has been played. Once play has begun it never reloads on its own:
// "Update available · Reload" waits for a tap. Every step is saved, so either
// way the career resumes where it was.
export const LAUNCH_MS = 10_000;

// `register` is registerSW from virtual:pwa-register, passed in so the prompt
// can be tested without a service worker; `clock` likewise.
export default function UpdatePrompt({ register, clock = Date.now, doc = typeof document === "undefined" ? null : document }) {
  const [update, setUpdate] = useState(null);
  const openedAt = useRef(clock());
  useEffect(() => {
    if (!register) return undefined;
    let registration = null;
    const updateSW = register({
      onNeedRefresh: () => {
        if (clock() - openedAt.current < LAUNCH_MS) updateSW(true);
        else setUpdate(() => updateSW);
      },
      // A home-screen app is resumed far more often than it is opened, so
      // look for a new version each time it comes back to the front.
      onRegisteredSW: (url, reg) => { registration = reg ?? null; },
    });
    const onVisible = () => { if (doc?.visibilityState === "visible") registration?.update?.(); };
    doc?.addEventListener("visibilitychange", onVisible);
    return () => doc?.removeEventListener("visibilitychange", onVisible);
  }, [register, clock, doc]);
  return <Toast open={Boolean(update)} message="Update available" action="Reload" duration={0} onAction={() => update?.(true)} onClose={() => setUpdate(null)} />;
}
