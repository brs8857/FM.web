import { selectBlockingBan, selectPlayoffFixture } from "../../src/state/selectors.js";
import { startPlayoffs } from "../../src/state/reducer.js";
import { makeInitialState } from "../../src/state/initialState.js";

// Answers "Replace X (suspended)" with the suggested cover, as Play to…
// does on its own with auto-cover on; where nobody of his kind is free, swaps
// in any free bench player instead.
export function coverBans(state, dispatch) {
  for (let ban = selectBlockingBan(state); ban; ban = selectBlockingBan(state = dispatch.last())) {
    if (dispatch({ type: "COVER_BAN", slotId: ban.slotId }) !== state) continue;
    const pick = state.bench.findIndex((b) => b.player && !(state.discipline[b.player.id]?.banned > 0));
    dispatch({ type: "SWAP_PLAYERS", fromKind: "bench", fromId: pick, toKind: "slot", toId: ban.slotId });
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
  playPlayoffs(dispatch);
}

// Plays any play-off matches the season ended with, covering bans first.
export function playPlayoffs(dispatch) {
  for (let guard = 0; selectPlayoffFixture(dispatch.last()) && guard < 6; guard++) {
    coverBans(dispatch.last(), dispatch);
    dispatch({ type: "PLAY_PLAYOFF" });
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
export function playCareer({ reducer, initialState, seasons = 6, check = () => {}, era = initialState.league === "championship" ? [2017, 2018] : [2000, 2011] }) {
  const dispatch = driver(reducer, initialState, check);
  const state = () => dispatch.last();

  dispatch({ type: "SET_ERA", min: era[0], max: era[1] });
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

// A Championship season finished at `position` (3rd to 6th), the play-offs
// drawn and nothing played yet.
export function makePlayoffState(reducer, dataset, { seed = 11, position = 4 } = {}) {
  const played = playCareer({ reducer, initialState: makeInitialState(dataset, seed, "championship"), seasons: 1 });
  const rows = played.simulation.table.filter((r) => !r.isUser);
  rows.splice(position - 1, 0, played.simulation.table.find((r) => r.isUser));
  const table = rows.map((r, i) => ({ ...r, position: i + 1 }));
  const s = { ...played, simulation: { ...played.simulation, table, position }, discipline: {} };
  return { ...s, playoffs: startPlayoffs(s, table, s.campaign.seed) };
}
