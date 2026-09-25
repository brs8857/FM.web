import { useEffect } from "react";

// Applies the theme and motion preferences as attributes the token sheet
// reads; cleared on unmount.
export function useDocumentPrefs(prefs) {
  const { theme, reduceMotion } = prefs;
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") delete root.dataset.theme; else root.dataset.theme = theme;
    if (reduceMotion === "system") delete root.dataset.reduceMotion; else root.dataset.reduceMotion = String(reduceMotion === "on");
    return () => {
      delete root.dataset.theme;
      delete root.dataset.reduceMotion;
    };
  }, [theme, reduceMotion]);
}
