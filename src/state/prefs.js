// Per-device preferences in `fmweb.prefs`. Never part of a save.
export const PREFS_KEY = "fmweb.prefs";

export const DEFAULT_PREFS = {
  theme: "system",
  reduceMotion: "system",
  haptics: true,
  clubNames: "real",
  club: null,
  seenNotes: [],
};

const THEMES = new Set(["system", "light", "dark"]);
const MOTION = new Set(["system", "on", "off"]);
const CLUB_NAMES = new Set(["real", "edited"]);
const SLUG = /^[a-z][a-z0-9-]*$/;

export function sanitizePrefs(value) {
  const v = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    theme: THEMES.has(v.theme) ? v.theme : DEFAULT_PREFS.theme,
    reduceMotion: MOTION.has(v.reduceMotion) ? v.reduceMotion : DEFAULT_PREFS.reduceMotion,
    haptics: typeof v.haptics === "boolean" ? v.haptics : DEFAULT_PREFS.haptics,
    clubNames: CLUB_NAMES.has(v.clubNames) ? v.clubNames : DEFAULT_PREFS.clubNames,
    club: typeof v.club === "string" && SLUG.test(v.club) ? v.club : DEFAULT_PREFS.club,
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
