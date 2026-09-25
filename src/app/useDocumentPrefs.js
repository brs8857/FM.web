import { useEffect } from "react";
import { clubTheme, clubThemeCss } from "../content/clubTheme.js";

export const CLUB_THEME_ID = "club-theme";

// Applies the theme and motion preferences as attributes the token sheet
// reads, and a favourite club's derived tokens as a stylesheet after it with
// the same three blocks, so light, dark and system switching stay in CSS.
// Both are cleared on unmount.
export function useDocumentPrefs(prefs) {
  const { theme, reduceMotion, club } = prefs;
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") delete root.dataset.theme; else root.dataset.theme = theme;
    if (reduceMotion === "system") delete root.dataset.reduceMotion; else root.dataset.reduceMotion = String(reduceMotion === "on");
    return () => {
      delete root.dataset.theme;
      delete root.dataset.reduceMotion;
    };
  }, [theme, reduceMotion]);
  useEffect(() => {
    const derived = club ? clubTheme(club) : null;
    if (!derived) return undefined;
    const style = document.createElement("style");
    style.id = CLUB_THEME_ID;
    style.textContent = clubThemeCss(derived);
    document.head.append(style);
    return () => style.remove();
  }, [club]);
}
