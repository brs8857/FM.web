import { careerSeasonLabel } from "../engine/season.js";
import { parseSaveText } from "./save.js";

export function saveFileName(state) {
  return `fmweb-season${state.season}-${careerSeasonLabel(state.season)}.json`;
}

export async function exportSaveText(text, fileName, { nav = navigator, win = window, doc = document } = {}) {
  const file = new File([text], fileName, { type: "application/json" });
  const touch = win.matchMedia?.("(pointer: coarse)").matches;
  if (touch && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: "FM.WEB save" });
      return "shared";
    } catch (error) {
      if (error?.name === "AbortError") return "cancelled";
      // Any other share failure falls through to a normal download.
    }
  }
  const url = URL.createObjectURL(file);
  const link = doc.createElement("a");
  link.href = url;
  link.download = fileName;
  doc.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}

export async function readImportFile(file) {
  return parseSaveText(await file.text());
}
