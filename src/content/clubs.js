import { seasonLabel } from "../engine/util.js";
import edited from "./clubs.json";

// Edited names (owner decision C3) describe a club without naming it.
export function clubName(name, mode = "real") {
  if (mode !== "edited") return name;
  return edited[name] ?? name;
}

export function clubSeasonLabel(dataset, seasonKey, mode = "real") {
  const [year, clubId] = String(seasonKey).split("_");
  const club = clubName(dataset.clubs?.[clubId] ?? clubId, mode);
  return `${club} ${seasonLabel(parseInt(year, 10))}`;
}
