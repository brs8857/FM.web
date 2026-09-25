import { seasonLabel } from "../engine/util.js";

// Club-season labels for players and cuttings ("Leeds United 2000-01").
export function clubSeasonLabel(dataset, seasonKey) {
  const [year, clubId] = String(seasonKey).split("_");
  const club = dataset.clubs?.[clubId] ?? clubId;
  return `${club} ${seasonLabel(parseInt(year, 10))}`;
}
