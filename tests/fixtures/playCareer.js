// Drives the reducer through a whole career the way a player would: draw
// three cuttings, pick from the first, and spend one redraw on the fourth pick.
export function playCareer({ reducer, initialState, seasons = 6, check = () => {} }) {
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
  let pick = 0;
  while (!state.draftDone) {
    dispatch({ type: "DRAW" });
    dispatch({ type: "LAND" });
    if (state.draw.options.length === 0) throw new Error(`Empty draw after ${step} actions`);
    if (pick === 3) dispatch({ type: "REDRAW" });
    dispatch({ type: "PICK_PLAYER", player: state.draw.options[0].players[0] });
    pick++;
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
