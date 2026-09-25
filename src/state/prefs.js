// Per-device preferences in `fmweb.prefs`. Never part of a save.
export const PREFS_KEY = "fmweb.prefs";

export const DEFAULT_PREFS = {
  layout: "v1", // "v1" | "v2" — the redesign preview flag until B11 makes v2 the default
  theme: "system", // "system" | "light" | "dark"
  reduceMotion: "system", // "system" | "on" | "off"
  haptics: true,
  clubNames: "real", // "real" | "edited"
  seenNotes: [], // coach's notes dismissed on this device
};

const LAYOUTS = new Set(["v1", "v2"]);
const THEMES = new Set(["system", "light", "dark"]);
const MOTION = new Set(["system", "on", "off"]);
const CLUB_NAMES = new Set(["real", "edited"]);

export function sanitizePrefs(value) {
  const v = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    layout: LAYOUTS.has(v.layout) ? v.layout : DEFAULT_PREFS.layout,
    theme: THEMES.has(v.theme) ? v.theme : DEFAULT_PREFS.theme,
    reduceMotion: MOTION.has(v.reduceMotion) ? v.reduceMotion : DEFAULT_PREFS.reduceMotion,
    haptics: typeof v.haptics === "boolean" ? v.haptics : DEFAULT_PREFS.haptics,
    clubNames: CLUB_NAMES.has(v.clubNames) ? v.clubNames : DEFAULT_PREFS.clubNames,
    seenNotes: Array.isArray(v.seenNotes) ? v.seenNotes.filter((n) => typeof n === "string") : DEFAULT_PREFS.seenNotes,
  };
}

export function readPrefs(storage) {
  if (!storage) return { ...DEFAULT_PREFS };
  try {
    const raw = storage.getItem(PREFS_KEY);
    return raw === null ? { ...DEFAULT_PREFS } : sanitizePrefs(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function writePrefs(storage, prefs) {
  const next = sanitizePrefs(prefs);
  if (!storage) return next;
  try {
    storage.setItem(PREFS_KEY, JSON.stringify(next));
  } catch {
    // Storage blocked or full; the preference still applies for this visit.
  }
  return next;
}

// `?layout=v2` saves the preview flag, `?layout=v1` clears it (Phase 1 spec §10).
// Returns the prefs in force for this visit.
export function applyLayoutFlag(search, storage) {
  const prefs = readPrefs(storage);
  const layout = new URLSearchParams(search).get("layout");
  if (!LAYOUTS.has(layout) || layout === prefs.layout) return prefs;
  return writePrefs(storage, { ...prefs, layout });
}
