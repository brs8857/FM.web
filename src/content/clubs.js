import { seasonLabel } from "../engine/util.js";
import edited from "./clubs.json";

// Club names for display (owner decision C3): the dataset's real names, or
// the edited names from clubs.json when the preference says so. Names
// without an edited form fall back to the real one.
export function clubName(name, mode = "real") {
  if (mode !== "edited") return name;
  return edited[name] ?? name;
}

// Club-season labels for players and cuttings ("Leeds United 2000-01").
export function clubSeasonLabel(dataset, seasonKey, mode = "real") {
  const [year, clubId] = String(seasonKey).split("_");
  const club = clubName(dataset.clubs?.[clubId] ?? clubId, mode);
  return `${club} ${seasonLabel(parseInt(year, 10))}`;
}
