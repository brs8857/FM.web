// One-way rekey (plan B10, owner decision C4): the club ids in players.json
// were Transfermarkt's numeric ids; this replaces them with slugs derived
// from the club names, in `clubs`, `squads` keys and `index`. It writes the
// old→new map to src/data/legacyClubIds.json so v1 saves migrate. Running it
// again is a no-op: ids that are not in the legacy map are left alone.
import { readFileSync, writeFileSync } from "node:fs";

const PLAYERS = "src/data/players.json";
const MAP = "src/data/legacyClubIds.json";

export function slugFor(name) {
  return name.toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/\b(fc|afc)\b/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function rekeyDataset(data) {
  const map = {};
  const clubs = {};
  for (const [id, name] of Object.entries(data.clubs)) {
    const slug = /^\d+$/.test(id) ? slugFor(name) : id;
    if (clubs[slug]) throw new Error(`duplicate slug ${slug} for ${name}`);
    clubs[slug] = name;
    if (slug !== id) map[id] = slug;
  }
  const squads = {};
  for (const [key, rows] of Object.entries(data.squads)) {
    const [year, id] = key.split("_");
    squads[`${year}_${map[id] ?? id}`] = rows;
  }
  const index = data.index.map((e) => ({ ...e, c: map[e.c] ?? e.c }));
  return { data: { ...data, clubs, squads, index }, map };
}

if (process.argv[1]?.endsWith("rekey-clubs.mjs")) {
  const data = JSON.parse(readFileSync(PLAYERS, "utf8"));
  const { data: rekeyed, map } = rekeyDataset(data);
  writeFileSync(PLAYERS, JSON.stringify(rekeyed) + "\n");
  const existing = (() => { try { return JSON.parse(readFileSync(MAP, "utf8")); } catch { return {}; } })();
  writeFileSync(MAP, JSON.stringify({ ...existing, ...map }, null, 1) + "\n");
  console.log(`rekeyed ${Object.keys(map).length} clubs; ${Object.keys(rekeyed.squads).length} squads`);
}
