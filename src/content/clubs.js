import { seasonLabel } from "../engine/util.js";
import edited from "./clubs.json";

// The archive's names are registry names ("Arsenal FC", "Wimbledon FC (- 2004)");
// the game prints them the way the back pages do.
function plainName(name) {
  return name.replace(/\s*\(-\s*\d{4}\)$/, "").replace(/^AFC\s+/, "").replace(/\s+A?FC$/, "");
}

// Edited names (owner decision C3) describe a club without naming it.
export function clubName(name, mode = "real") {
  return (mode === "edited" && edited[name]) || plainName(name);
}

export function clubSeasonLabel(dataset, seasonKey, mode = "real") {
  const [year, clubId] = String(seasonKey).split("_");
  const club = clubName(dataset.clubs?.[clubId] ?? clubId, mode);
  return `${club} ${seasonLabel(parseInt(year, 10))}`;
}
