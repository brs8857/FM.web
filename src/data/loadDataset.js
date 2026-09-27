let pending = null;

// The two archives share one club map and one squad map (a club plays in one
// division a season, so their `year_slug` keys never collide); each keeps its
// own draft index. Dynamic imports give the data its own cached chunk
// (parsed via JSON.parse, see vite.config.js json.stringify). The standalone
// single-file build inlines it.
export function mergeDataset(players, championship) {
  return {
    clubs: { ...players.clubs, ...championship.clubs },
    squads: { ...players.squads, ...championship.squads },
    index: players.index,
    championshipIndex: championship.index,
    opponents: players.opponents,
    premier: players.premier,
    place: players.place,
    championship: { table: championship.table, reserve: championship.reserve, place: championship.place },
  };
}

export function loadDataset() {
  if (!pending) {
    pending = Promise.all([import("./players.json"), import("./championship.json")])
      .then(([players, championship]) => mergeDataset(players.default, championship.default))
      .catch((error) => {
        pending = null;
        throw error;
      });
  }
  return pending;
}
