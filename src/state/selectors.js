import { ROLES } from "../engine/roles.js";
import { DEFAULT_INSTRUCTIONS } from "../engine/instructions.js";
import { computeFamiliarity, eraSpread, eraSpreadPenalty, memoryBonus, settling, EMPTY_MEMORY, SIDE_MISMATCH_PENALTY } from "../engine/familiarity.js";
import { computeTeamProfile, identityKey } from "../engine/tactics.js";
import { CAREER_SEASONS, SEASON_WEEKS, buildUserFixtureList, leagueTable } from "../engine/season.js";
import { nextEmptySlotIndex } from "../engine/squad.js";
import { t } from "../content/t.js";

const DECADE_LABEL = { 1990: "'90s", 2000: "2000s", 2010: "2010s", 2020: "2020s" };

function seasonYear(player) {
  return parseInt(String(player.seasonKey).split("_")[0], 10);
}

// The squad strip during the draft (spec 04 §5.2): how many picked, which
// decades they come from, and the era-spread cost so far. Cohesion itself is
// only defined for a full XI, so it appears once the eleventh pick is in.
export function selectDraftSummary(state) {
  const players = state.assignments.map((a) => a.player).filter(Boolean);
  const counts = new Map();
  for (const p of players) {
    const decade = Math.floor(seasonYear(p) / 10) * 10;
    counts.set(decade, (counts.get(decade) ?? 0) + 1);
  }
  const decades = [...counts.entries()].sort((a, b) => a[0] - b[0]).map(([decade, count]) => ({ label: DECADE_LABEL[decade] ?? `${decade}s`, count }));
  const spread = eraSpread(players);
  const complete = players.length === 11;
  const cohesion = complete ? computeFamiliarity(liveAssignments(state.assignments), state.instructions, state.formationKey, state.cohesionMemory) : null;
  return { picked: players.length, decades, spread, eraPenalty: Math.round(eraSpreadPenalty(spread) * 10) / 10, complete, cohesion };
}

// What picking `player` for the next empty slot does to the squad strip: the
// era spread before and after, and the cohesion costs it adds. Uses the same
// pieces computeFamiliarity charges, on the hypothetical squad.
export function previewPick(state, player) {
  const idx = nextEmptySlotIndex(state.assignments);
  const slot = idx >= 0 ? state.assignments[idx] : null;
  const players = state.assignments.map((a) => a.player).filter(Boolean);
  const before = eraSpread(players);
  const after = eraSpread([...players, player]);
  const eraDelta = -Math.round((eraSpreadPenalty(after) - eraSpreadPenalty(before)) * 10) / 10;
  const sideMismatch = Boolean(slot?.side && player.side && slot.side !== player.side);
  return {
    slotId: slot?.slotId ?? null, type: slot?.type ?? null, slotSide: slot?.side ?? null,
    first: players.length === 0, spreadBefore: before, spreadAfter: after, eraDelta,
    sideMismatch, sideDelta: sideMismatch ? -SIDE_MISMATCH_PENALTY : 0,
    offPosition: Boolean(slot && player.slot !== slot.type),
  };
}

export function selectEraIndex(index, eraMin, eraMax) {
  return index.filter((e) => {
    const y = parseInt(e.y, 10);
    return y >= eraMin && y <= eraMax;
  });
}

export function liveAssignments(assignments) {
  return assignments.map((a) => ({
    ...a,
    role: a.role ? (ROLES[a.type].find((r) => r.key === a.role) || null) : null,
  }));
}

export function selectFamiliarity(live, instructions, formationKey, memory = null) {
  return computeFamiliarity(live, instructions, formationKey, memory);
}

// The part of cohesion that comes from seasons in the same system.
export function selectMemory(state) {
  const memory = state.cohesionMemory ?? EMPTY_MEMORY;
  return { seasons: memory.seasons, bonus: memoryBonus(memory, state.formationKey, identityKey(state.instructions)) };
}

export function selectProfile(live, instructions, familiarity) {
  return computeTeamProfile(live, instructions, familiarity);
}

// Starters serving a ban. Each must be swapped out before the next match
// while the bench has anyone free to come in; with nobody, the side plays
// a man short.
export function selectSuspended(state) {
  const discipline = state.discipline ?? {};
  return state.assignments.filter((a) => a.player && discipline[a.player.id]?.banned > 0)
    .map((a) => ({ slotId: a.slotId, id: a.player.id, name: a.player.name }));
}

export function selectBlockingBan(state) {
  const discipline = state.discipline ?? {};
  const cover = state.bench.some((b) => b.player && !(discipline[b.player.id]?.banned > 0));
  return cover ? selectSuspended(state)[0] ?? null : null;
}

// What the next fixture's cohesion gains or loses from matches already played
// in this system (spec 07 §4.3).
export function selectSettling(state) {
  return settling(state.cohesionMemory ?? EMPTY_MEMORY, state.formationKey, state.instructions);
}

// The league after `week` rounds of the season in progress (by default, every
// round played so far). Rebuilt from the season seed, so it is cached per
// campaign: a campaign object never changes once made.
const tables = new WeakMap();
export function selectTable(state, week) {
  const campaign = state.campaign;
  if (!campaign) return null;
  const upTo = Math.min(week ?? campaign.log.length, campaign.log.length);
  if (!tables.has(campaign)) tables.set(campaign, new Map());
  const cache = tables.get(campaign);
  if (!cache.has(upTo)) {
    cache.set(upTo, leagueTable(state.opponents, campaign.order, campaign.log.slice(0, upTo), campaign.seed).map((row) => ({ ...row, gd: row.gf - row.ga })));
  }
  return cache.get(upTo);
}

export function selectNextFixture(state) {
  const campaign = state.campaign;
  if (!campaign || campaign.week > SEASON_WEEKS) return null;
  const fixture = buildUserFixtureList(campaign.order)[campaign.week - 1];
  const opponent = state.opponents.find((o) => o.name === fixture.name);
  const row = selectTable(state).find((r) => r.name === fixture.name);
  return { ...fixture, opponent, row, promoted: opponent?.lastSeason === "promoted" };
}

// Our scorers in a match log, most goals first. A player is counted by id, so
// the same man across seasons of a career is one line.
export function selectTopScorers(log, n = 3) {
  const tally = new Map();
  for (const match of log ?? []) {
    for (const goal of match.goals ?? []) {
      if (!goal.us) continue;
      const key = goal.id ?? goal.name;
      const entry = tally.get(key) ?? { id: goal.id ?? null, name: goal.name, goals: 0 };
      entry.goals += 1;
      tally.set(key, entry);
    }
  }
  return [...tally.values()].sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name)).slice(0, n);
}

// The v1 draft screen still speaks wheel/pool; the first cutting stands in
// for the landed club-season until B11 retires it.
export function selectLegacyWheel(state) {
  const { spinning, options } = state.draw;
  const first = options[0];
  return {
    wheel: { spinning, landed: first ? { year: first.year, clubId: first.clubId, label: first.label } : null },
    pool: first ? first.players : [],
    poolRelaxed: first ? first.relaxed : false,
  };
}

// The record: every completed season, plus the one just played while its
// result is still on screen (it joins seasonHistory when the window opens).
export function selectSeasonHistory(state, summarize) {
  if (state.phase === "result" && state.simulation && !state.seasonHistory.some((s) => s.season === state.season)) {
    return [...state.seasonHistory, summarize(state)];
  }
  return state.seasonHistory;
}

export function tacticUntouched(state) {
  return state.selectedStyle === null
    && Object.keys(DEFAULT_INSTRUCTIONS).every((k) => state.instructions[k] === DEFAULT_INSTRUCTIONS[k]);
}

// The one action that moves the career on (spec 04 §4.2). `tab` is the Club
// tab that holds it; null while the career is still being set up.
export function selectNextAction(state, clubName = (name) => name) {
  const { phase, season } = state;
  switch (phase) {
    case "formation":
      return { key: "startDraft", label: "Start the draft", tab: null };
    case "draft": {
      if (state.draftDone) return { key: "goToBoard", label: "Go to the board", tab: null };
      const filled = state.assignments.filter((a) => a.player).length;
      const pick = Math.min(11, filled + 1);
      const idx = nextEmptySlotIndex(state.assignments);
      return { key: "draft", label: `Draft in progress: pick ${pick} of 11`, tab: null, pick, slotId: idx >= 0 ? state.assignments[idx].slotId : null };
    }
    case "tactics":
      if (tacticUntouched(state)) return { key: "setTactic", label: "Set your tactic", tab: "board" };
      return { key: "kickOff", label: `Kick off season ${season}`, tab: "season" };
    case "reveal":
      return { key: "startSeason", label: `Start season ${season}`, tab: "season" };
    case "matchday": {
      const suspended = selectBlockingBan(state);
      if (suspended) return { key: "replaceSuspended", label: t("season.suspended", { name: suspended.name }), tab: "squad", slotId: suspended.slotId };
      const fixture = selectNextFixture(state);
      if (!fixture) return { key: "unknown", label: "Continue", tab: "season" };
      const label = t("season.play", { week: fixture.week, opponent: clubName(fixture.name), venue: fixture.home ? "H" : "A" });
      return { key: "playMatch", label, tab: "season", week: fixture.week, opponent: fixture.name, home: fixture.home };
    }
    case "result":
      if (season >= CAREER_SEASONS) return { key: "careerComplete", label: "Career complete", tab: "club" };
      return { key: "openWindow", label: "Open the window", tab: "season" };
    case "transfer":
      return { key: "closeWindow", label: "Close the window", tab: "season" };
    default:
      return { key: "unknown", label: "Continue", tab: null };
  }
}
