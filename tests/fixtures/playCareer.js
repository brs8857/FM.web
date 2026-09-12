// Drives the reducer through a whole career the way a player would.
export function playCareer({ reducer, initialState, index, seasons = 6, check = () => {} }) {
  let state = initialState;
  let step = 0;
  const dispatch = (action) => {
    const previous = state;
    state = reducer(state, action);
    step++;
    check(state, action, previous);
  };

  dispatch({ type: "SET_ERA", min: 2000, max: 2011 });
  dispatch({ type: "START_DRAFT" });
  while (!state.draftDone) {
    dispatch({ type: "SPIN" });
    const entry = index[step % index.length];
    dispatch({ type: "LAND", year: entry.y, clubId: entry.c, label: entry.label });
    if (state.pool.length === 0) throw new Error(`Empty draft pool after ${step} actions`);
    dispatch({ type: "PICK_PLAYER", player: state.pool[0] });
  }
  dispatch({ type: "SKIP_TO_TACTICS" });
  dispatch({ type: "SET_STYLE", key: "gegenpress" });

  for (let season = 1; season <= seasons; season++) {
    dispatch({ type: "SIMULATE" });
    dispatch({ type: "KICKOFF" });
    if (season === seasons) break;
    dispatch({ type: "GOTO_TRANSFER" });
    dispatch({ type: "SIGN_SHORTLIST_TO_BENCH", index: 0 });
    dispatch({ type: "SIGN_SHORTLIST_TO_XI", index: 1, slotId: "ST" });
    dispatch({ type: "CONTINUE_SEASON" });
  }
  return state;
}
