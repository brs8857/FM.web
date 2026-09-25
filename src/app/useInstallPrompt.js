import { useEffect, useState } from "react";

export function isStandalone(win = window) {
  return win.matchMedia?.("(display-mode: standalone)").matches || win.navigator?.standalone === true;
}

export function isIosSafari(nav = navigator) {
  const ua = nav.userAgent ?? "";
  return /iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS/.test(ua);
}

// Captures beforeinstallprompt so Settings can offer "Install app"; on iOS
// Safari, where there is no prompt, it reports that the hint should show.
// No automatic prompts (Phase 1 spec §7.1).
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(() => (typeof window === "undefined" ? false : isStandalone()));
  useEffect(() => {
    const onPrompt = (event) => { event.preventDefault(); setDeferred(event); };
    const onInstalled = () => { setDeferred(null); setInstalled(true); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice.catch(() => {});
    setDeferred(null);
  };
  return { canInstall: Boolean(deferred), install, installed, iosHint: !installed && typeof navigator !== "undefined" && isIosSafari() };
}
