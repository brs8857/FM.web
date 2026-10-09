import { useEffect } from "react";
import { clubTheme, clubThemeCss } from "../content/clubTheme.js";

export const CLUB_THEME_ID = "club-theme";

// The club theme is a stylesheet with the same three blocks as tokens.css,
// placed after it, so switching between light, dark and system stays in CSS.
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
