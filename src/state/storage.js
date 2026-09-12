import { validateSave } from "./save.js";

export const SAVE_KEY = "fmweb.save";
export const CORRUPT_KEY = "fmweb.save.corrupt";

export function getStorage(win = window) {
  try {
    const storage = win.localStorage;
    const probe = "fmweb.probe";
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

export function readAutosave(storage) {
  const raw = storage.getItem(SAVE_KEY);
  if (raw === null) return { status: "none" };
  let parsed = null;
  try {
    parsed = validateSave(JSON.parse(raw));
  } catch {
    parsed = { ok: false };
  }
  if (parsed.ok) return { status: "ok", save: parsed.save };
  try {
    storage.setItem(CORRUPT_KEY, raw);
    storage.removeItem(SAVE_KEY);
  } catch {
    // Keeping the damaged copy is best effort; the game still starts.
  }
  return { status: "corrupt" };
}

export function writeAutosave(storage, text) {
  try {
    storage.setItem(SAVE_KEY, text);
    return true;
  } catch {
    return false;
  }
}

export function clearAutosave(storage) {
  if (!storage) return;
  try {
    storage.removeItem(SAVE_KEY);
  } catch {
    // Nothing more to do when storage is blocked.
  }
}

export function requestPersistentStorage(nav = navigator) {
  if (nav?.storage?.persist) nav.storage.persist().catch(() => {});
}
