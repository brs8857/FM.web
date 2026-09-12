let pending = null;

// Dynamic imports give the data its own cached chunk (parsed via JSON.parse,
// see vite.config.js json.stringify). The standalone single-file build inlines it.
export function loadDataset() {
  if (!pending) {
    pending = Promise.all([import("./players.json"), import("./championship.json")])
      .then(([players, championship]) => ({ ...players.default, championship: championship.default }))
      .catch((error) => {
        pending = null;
        throw error;
      });
  }
  return pending;
}
