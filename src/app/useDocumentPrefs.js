import { useEffect } from "react";

// Marks the document for the v2 tree and applies the theme and motion
// preferences as attributes the token sheet reads. Cleared on unmount so
// switching back to v1 leaves the document as it found it.
export function useDocumentPrefs(prefs) {
  const { theme, reduceMotion } = prefs;
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.layout = "v2";
    if (theme === "system") delete root.dataset.theme; else root.dataset.theme = theme;
    if (reduceMotion === "system") delete root.dataset.reduceMotion; else root.dataset.reduceMotion = String(reduceMotion === "on");
    return () => {
      delete root.dataset.layout;
      delete root.dataset.theme;
      delete root.dataset.reduceMotion;
    };
  }, [theme, reduceMotion]);
}
