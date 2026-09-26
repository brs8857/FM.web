import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDocumentPrefs, CLUB_THEME_ID } from "./useDocumentPrefs.js";
import { DEFAULT_PREFS } from "../state/prefs.js";
import { clubTheme } from "../content/clubTheme.js";

const sheet = () => document.getElementById(CLUB_THEME_ID);

describe("useDocumentPrefs", () => {
  it("sets the theme and motion attributes and clears them on unmount", () => {
    const { rerender, unmount } = renderHook((p) => useDocumentPrefs(p), { initialProps: { ...DEFAULT_PREFS, theme: "dark", reduceMotion: "on" } });
    expect(document.documentElement.dataset).toMatchObject({ theme: "dark", reduceMotion: "true" });
    rerender({ ...DEFAULT_PREFS });
    expect(document.documentElement.dataset.theme).toBeUndefined();
    expect(document.documentElement.dataset.reduceMotion).toBeUndefined();
    unmount();
  });

  it("adds a club's derived tokens as a stylesheet with light, system-dark and dark blocks, and removes it again", () => {
    const { rerender, unmount } = renderHook((p) => useDocumentPrefs(p), { initialProps: { ...DEFAULT_PREFS } });
    expect(sheet()).toBeNull();
    rerender({ ...DEFAULT_PREFS, club: "arsenal" });
    const css = sheet().textContent;
    const { light, dark } = clubTheme("arsenal");
    expect(css).toContain(`--paper: ${light.paper};`);
    expect(css).toContain(`--paper: ${dark.paper};`);
    expect(css).toMatch(/@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-theme="light"\]\)/);
    expect(css).toMatch(/\[data-theme="dark"\]\s*\{/);
    expect(css).toContain("color-scheme: dark;");
    rerender({ ...DEFAULT_PREFS, club: "chelsea", theme: "dark" });
    expect(document.querySelectorAll(`#${CLUB_THEME_ID}`)).toHaveLength(1);
    expect(sheet().textContent).toContain(`--paper: ${clubTheme("chelsea").light.paper};`);
    expect(document.documentElement.dataset.theme).toBe("dark");
    rerender({ ...DEFAULT_PREFS, club: "not-a-club" });
    expect(sheet()).toBeNull();
    rerender({ ...DEFAULT_PREFS, club: "arsenal" });
    unmount();
    expect(sheet()).toBeNull();
  });
});
