import { selectBlockingBan } from "../../src/state/selectors.js";

// Swaps each banned starter for a free bench player, one of his position if
// there is one, as a player answering "Replace X (suspended)" would.
export function coverBans(state, dispatch) {
  for (let ban = selectBlockingBan(state); ban; ban = selectBlockingBan(state = dispatch.last())) {
    const slot = state.assignments.find((a) => a.slotId === ban.slotId);
    const free = state.bench.map((b, i) => ({ b, i })).filter(({ b }) => b.player && !(state.discipline[b.player.id]?.banned > 0));
    const pick = free.find(({ b }) => b.player.slot === slot.type) ?? free[0];
    dispatch({ type: "SWAP_PLAYERS", fromKind: "bench", fromId: pick.i, toKind: "slot", toId: ban.slotId });
  }
}

// Kick off, start the season after the reveal, then fast-forward to the half
// and on to the end, covering bans whenever a run stops for one.
export function playSeason(dispatch) {
  dispatch({ type: "START_SEASON" });
  dispatch({ type: "KICKOFF" });
  dispatch({ type: "PLAY_TO", until: "half" });
  for (let guard = 0; dispatch.last().phase === "matchday" && guard < 40; guard++) {
    coverBans(dispatch.last(), dispatch);
    dispatch({ type: "PLAY_TO", until: "end" });
  }
}

// Wraps a reducer as a dispatch that remembers the latest state.
export function driver(reducer, initialState, check = () => {}) {
  let state = initialState;
  const dispatch = (action) => {
    const previous = state;
    state = reducer(state, action);
    check(state, action, previous);
    return state;
  };
  dispatch.last = () => state;
  return dispatch;
}

// Plays `count` matches one at a time from match day (all that remain by
// default), covering bans as they come.
export function playMatches(reducer, state, count = Infinity) {
  const dispatch = driver(reducer, state);
  for (let i = 0; i < count && dispatch.last().phase === "matchday"; i++) {
    coverBans(dispatch.last(), dispatch);
    dispatch({ type: "PLAY_MATCH" });
  }
  return dispatch.last();
}

// Kick-off to the final whistle from pre-season.
export function playWholeSeason(reducer, state) {
  const dispatch = driver(reducer, state);
  playSeason(dispatch);
  return dispatch.last();
}

// Drives the reducer through a whole career the way a player would: draw
// three cuttings, pick from the first, and spend one redraw on the fourth pick.
export function playCareer({ reducer, initialState, seasons = 6, check = () => {} }) {
  const dispatch = driver(reducer, initialState, check);
  const state = () => dispatch.last();

  dispatch({ type: "SET_ERA", min: 2000, max: 2011 });
  dispatch({ type: "START_DRAFT" });
  let pick = 0;
  while (!state().draftDone) {
    dispatch({ type: "DRAW" });
    dispatch({ type: "LAND" });
    if (state().draw.options.length === 0) throw new Error(`Empty draw at pick ${pick}`);
    if (pick === 3) dispatch({ type: "REDRAW" });
    dispatch({ type: "PICK_PLAYER", player: state().draw.options[0].players[0] });
    pick++;
  }
  dispatch({ type: "SKIP_TO_TACTICS" });
  dispatch({ type: "SET_STYLE", key: "gegenpress" });

  for (let season = 1; season <= seasons; season++) {
    playSeason(dispatch);
    if (season === seasons) break;
    dispatch({ type: "GOTO_TRANSFER" });
    dispatch({ type: "SIGN_SHORTLIST_TO_BENCH", index: 0 });
    dispatch({ type: "SIGN_SHORTLIST_TO_XI", index: 1, slotId: "ST" });
    dispatch({ type: "CONTINUE_SEASON" });
  }
  return state();
}
