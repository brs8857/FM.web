import { clamp } from "../engine/util.js";
import { FORMATIONS, makeInitialAssignments } from "../engine/formations.js";
import { ROLES, defaultRoleFor, defaultDutyFor } from "../engine/roles.js";
import { STYLE_PRESETS } from "../engine/instructions.js";
import { createSquadLookup, buildPool, buildBenchPool } from "../engine/players.js";
import { computeTeamProfile, identityKey } from "../engine/tactics.js";
import { computeFamiliarity, nextMemory, settling, afterMatch, EMPTY_MEMORY } from "../engine/familiarity.js";
import { buildUserFixtureList, simulateFixture, eventRng, seasonResult, seasonWeeks, halfSeason, USER_TEAM } from "../engine/season.js";
import { matchEvents, nextDiscipline, rivalStrength } from "../engine/match.js";
import { nextDivisions, TOP, CHAMPIONSHIP, DIVISION_CLUBS, PLAYOFF_PLACES } from "../engine/divisions.js";
import { playoffDraw, playoffRng, rivalTie, rivalFinal, rivalPlayoffs, breakTie, userStrength } from "../engine/playoffs.js";
import { nextEmptySlotIndex, fillPick, benchFitIndex, BENCH_SIZE, generateShortlist, signToSlot, signToBench, progressSquad, wageCost, windowBudget, budgetLeft } from "../engine/squad.js";
import { playerIdentity } from "../engine/identity.js";
import { makeInitialState, DRAW_OPTIONS, REDRAWS, ERAS } from "./initialState.js";
import { takeRng } from "./rngState.js";
import { selectArchive, selectEraIndex, liveAssignments, selectTopScorers, selectSuspended, selectBlockingBan, selectDraftStage, isBanned } from "./selectors.js";

const idleDraw = (draw) => ({ ...draw, spinning: false, options: [] });

// A bench player into a starting slot, the starter to his place on the bench.
// Job, brief and dials reset to the slot's defaults.
function benchToSlot(state, benchIdx, slotId) {
  const assignments = state.assignments.map((a) => ({ ...a }));
  const bench = state.bench.map((b) => ({ ...b }));
  const toA = assignments.find((a) => a.slotId === slotId);
  const incoming = bench[benchIdx].player;
  const role = defaultRoleFor(toA.type);
  bench[benchIdx] = { player: toA.player, role: null, duty: null };
  Object.assign(toA, { player: incoming, role: role.key, duty: defaultDutyFor(role), sliderAtt: 50, sliderDef: 50 });
  return { assignments, bench };
}

// The best free fit on the bench for a suspended starter (spec 08 §6.2),
// recorded so the starter can go back once the ban is served.
export function coverBan(state, slotId) {
  const slot = state.assignments.find((a) => a.slotId === slotId);
  if (!slot?.player || !isBanned(state, slot.player)) return state;
  const idx = benchFitIndex(state.bench, slot.type, (p) => !isBanned(state, p));
  if (idx < 0) return state;
  const cover = { slotId, starterId: slot.player.id, coverId: state.bench[idx].player.id };
  return { ...state, ...benchToSlot(state, idx, slotId), covers: [...(state.covers ?? []).filter((c) => c.slotId !== slotId), cover] };
}

function coverAll(state) {
  return selectSuspended(state).reduce((s, { slotId }) => coverBan(s, slotId), state);
}

// Puts each covered starter back once his ban is served (or, with `all`,
// regardless), but only where both players are still where the cover put
// them; a cover the manager has since rearranged is dropped.
export function restoreCovers(state, all = false) {
  let next = state;
  const keep = [];
  for (const c of state.covers ?? []) {
    if (!all && next.discipline?.[c.starterId]?.banned > 0) { keep.push(c); continue; }
    const slot = next.assignments.find((a) => a.slotId === c.slotId);
    const benchIdx = next.bench.findIndex((b) => b.player?.id === c.starterId);
    if (slot?.player?.id === c.coverId && benchIdx >= 0) next = { ...next, ...benchToSlot(next, benchIdx, c.slotId) };
  }
  return { ...next, covers: keep };
}

function coveredNames(state) {
  const everyone = [...state.assignments, ...state.bench].map((e) => e.player).filter(Boolean);
  const name = (id) => everyone.find((p) => p.id === id)?.name ?? "";
  return (state.covers ?? []).map((c) => ({ in: name(c.coverId), out: name(c.starterId) }));
}

function addToBench(state, player) {
  const draftedIds = new Set(state.draftedIds);
  draftedIds.add(player.id);
  return {
    ...state, draftedIds, draftedIdentities: [...state.draftedIdentities, playerIdentity(player)],
    bench: [...state.bench, { player, role: null, duty: null }],
  };
}

function affordableSigning(state, index) {
  const entry = state.shortlist[index];
  if (!entry || entry.signed) return null;
  const { cost } = entry;
  const { transferBudget } = state;
  if (cost > budgetLeft(transferBudget)) return null;
  const draftedIds = new Set(state.draftedIds); draftedIds.add(entry.player.id);
  return {
    entry,
    changes: {
      draftedIds,
      draftedIdentities: [...state.draftedIdentities, playerIdentity(entry.player)],
      shortlist: state.shortlist.map((s, i) => (i === index ? { ...s, signed: true } : s)),
      transferBudget: { ...transferBudget, spent: transferBudget.spent + cost },
    },
  };
}

// A season played before the match log existed (a migrated save) has
// results without events; it is recorded without a log.
export function hasMatchLog(matches) {
  return Array.isArray(matches) && matches.length > 0 && matches.every((m) => Array.isArray(m.goals) && m.played);
}

export function summarizeSeason(state) {
  const { simulation: s, season, careerSeed } = state;
  const matches = hasMatchLog(s.matches) ? s.matches : [];
  const [top] = selectTopScorers(matches, 1);
  return {
    season, position: s.position, pts: s.pts, w: s.w, d: s.d, l: s.l, gf: s.gf, ga: s.ga,
    tier: s.tier.name, identity: s.profile.synergyLabel, familiarity: s.familiarity, seed: careerSeed,
    matches, topScorer: top ? { name: top.name, goals: top.goals } : null,
    division: state.division ?? TOP, playoff: playoffOutcome(state.playoffs),
  };
}

// How far the play-offs took you: "won", "final", "semi", or null.
export function playoffOutcome(playoffs) {
  if (!playoffs || playoffs.stage !== "done") return null;
  if (playoffs.winner === USER_TEAM) return "won";
  return playoffs.final ? "final" : "semi";
}

// What the board is for the next fixture: cohesion with the seasons in this
// system and the settling, and the profile it plays to. A banned starter
// nobody could replace leaves his place empty.
export function lineupFor(state) {
  const banned = new Set(selectSuspended(state).map((s) => s.slotId));
  const live = liveAssignments(state.assignments).map((a) => (banned.has(a.slotId) ? { ...a, player: null, role: null } : a));
  const memory = state.cohesionMemory ?? EMPTY_MEMORY;
  const settle = settling(memory, state.formationKey, state.instructions);
  const familiarity = computeFamiliarity(live, state.instructions, state.formationKey, memory);
  const profile = computeTeamProfile(live, state.instructions, familiarity);
  return { live, settle, familiarity, profile };
}

// The identity the season was mostly played in, for the seasons memory; a
// tie goes to the later one.
function seasonStyle(log) {
  const counts = new Map();
  for (const m of log) counts.set(m.played.identity, (counts.get(m.played.identity) ?? 0) + 1);
  return [...counts.entries()].reduce((best, entry) => (entry[1] >= best[1] ? entry : best))[0];
}

// One fixture, read from the board as it stands. Everything random derives
// from the campaign's seed and the week, so no draw is taken from the career
// and nothing done between matches shifts a result.
function playMatch(state) {
  const { campaign } = state;
  const weeks = seasonWeeks(campaign?.order.length ?? 0);
  if (state.phase !== "matchday" || !campaign || campaign.week > weeks) return state;
  if (selectBlockingBan(state)) return state;
  const fixture = buildUserFixtureList(campaign.order)[campaign.week - 1];
  const opponent = state.opponents.find((o) => o.name === fixture.name);
  const { live, settle, familiarity, profile } = lineupFor(state);
  const result = simulateFixture(profile, familiarity, opponent, fixture, campaign.seed);
  const { goals, cards } = matchEvents(result, live, eventRng(campaign.seed, fixture.week), { tackling: state.instructions.tackling });
  const { discipline, bans } = nextDiscipline(state.discipline ?? {}, cards, fixture.week, weeks);
  const played = { identity: identityKey(state.instructions), cohesion: familiarity, settle: settle.modifier, mentality: state.instructions.mentality, changed: settle.changed };
  const covered = coveredNames(state);
  const log = [...campaign.log, { ...result, goals, cards, bans: bans.map((b) => ({ name: b.name, matches: b.matches })), ...(covered.length ? { covered } : {}), played }];
  const next = { ...state, discipline, campaign: { ...campaign, week: campaign.week + 1, log }, cohesionMemory: afterMatch(state.cohesionMemory ?? EMPTY_MEMORY, settle) };
  if (fixture.week < weeks) return next;
  const cohesionMemory = nextMemory(state.cohesionMemory, state.formationKey, seasonStyle(log));
  const simulation = { ...seasonResult(state.opponents, campaign.order, log, campaign.seed, state.division), profile, familiarity, instructions: state.instructions, season: state.season };
  return { ...next, phase: "result", cohesionMemory, simulation, playoffs: startPlayoffs(state, simulation.table, campaign.seed) };
}

// A Championship finish from 3rd to 6th starts the play-offs: your semi-final
// against the side the draw gives you, and the other semi-final played out
// now (it is shown once yours is decided).
export function startPlayoffs(state, table, seasonSeed) {
  if (state.division !== CHAMPIONSHIP) return null;
  const position = table.find((r) => r.isUser).position;
  if (position < PLAYOFF_PLACES[0] || position > PLAYOFF_PLACES[1]) return null;
  const draw = playoffDraw(table);
  const mine = draw.find((pair) => pair.includes(USER_TEAM));
  const theirs = draw.find((pair) => !pair.includes(USER_TEAM));
  const club = (name) => state.opponents.find((o) => o.name === name);
  const other = rivalTie(club(theirs[0]), club(theirs[1]), playoffRng(seasonSeed, "semi1"));
  return {
    seed: seasonSeed, draw,
    semi: { opponent: mine.find((n) => n !== USER_TEAM), higher: mine[0] === USER_TEAM, legs: [] },
    other, final: null, stage: "semi1", winner: null, weeks: seasonWeeks(state.campaign.order.length),
  };
}

// The next play-off match, played from the board as it stands, as a league
// fixture is: the lower-placed side hosts the first leg; the final is on
// neutral ground, which in this engine is the same as away.
function playPlayoff(state) {
  const po = state.playoffs;
  if (!po || po.stage === "done" || state.phase !== "result") return state;
  const ready = state.autoCover ? coverAll(state) : state;
  if (selectBlockingBan(ready)) return state;
  const inFinal = po.stage === "final";
  const opponentName = inFinal ? po.final.opponent : po.semi.opponent;
  const opponent = ready.opponents.find((o) => o.name === opponentName);
  const week = po.weeks + 1 + (po.stage === "semi1" ? 0 : po.stage === "semi2" ? 1 : 2);
  const home = inFinal ? false : (po.stage === "semi1") !== po.semi.higher;
  const { live, settle, familiarity, profile } = lineupFor(ready);
  const result = simulateFixture(profile, familiarity, opponent, { week, name: opponentName, home }, po.seed);
  const { goals, cards } = matchEvents(result, live, eventRng(po.seed, week), { tackling: ready.instructions.tackling });
  const { discipline, bans } = nextDiscipline(ready.discipline ?? {}, cards, week, po.weeks);
  const played = { identity: identityKey(ready.instructions), cohesion: familiarity, settle: settle.modifier, mentality: ready.instructions.mentality, changed: settle.changed };
  const covered = coveredNames(ready);
  const match = { ...result, round: po.stage, goals, cards, bans: bans.map((b) => ({ name: b.name, matches: b.matches })), ...(covered.length ? { covered } : {}), played };
  const after = { ...ready, discipline, cohesionMemory: afterMatch(ready.cohesionMemory ?? EMPTY_MEMORY, settle) };
  const tieBreak = (strengthOpp) => breakTie(userStrength(profile), strengthOpp, playoffRng(po.seed, po.stage)) === "a";
  if (po.stage === "semi1") return restoreCovers({ ...after, playoffs: { ...po, semi: { ...po.semi, legs: [match] }, stage: "semi2" } });
  if (po.stage === "semi2") {
    const legs = [...po.semi.legs, match];
    const us = legs.reduce((n, m) => n + m.gf, 0), them = legs.reduce((n, m) => n + m.ga, 0);
    const through = us > them || (us === them && tieBreak(rivalStrength(opponent)));
    const semi = { ...po.semi, legs, aggregate: [us, them], ...(us === them ? { extraTime: through ? "won" : "lost" } : {}) };
    if (!through) {
      const final = rivalFinal(opponent, ready.opponents.find((o) => o.name === po.other.winner), playoffRng(po.seed, "final"));
      return restoreCovers({ ...after, playoffs: { ...po, semi, stage: "done", winner: final.winner, rivalFinal: final }, simulation: { ...after.simulation, tier: { name: "Play-off semi-final" } } });
    }
    return restoreCovers({ ...after, playoffs: { ...po, semi, stage: "final", final: { opponent: po.other.winner, match: null } } });
  }
  const won = match.gf > match.ga || (match.gf === match.ga && tieBreak(rivalStrength(opponent)));
  const final = { ...po.final, match: { ...match, ...(match.gf === match.ga ? { extraTime: won ? "won" : "lost" } : {}) } };
  const tier = { name: won ? "Play-off winners" : "Play-off final" };
  return restoreCovers({ ...after, playoffs: { ...po, final, stage: "done", winner: won ? USER_TEAM : opponent.name }, simulation: { ...after.simulation, tier } });
}

// Fast-forward with the board frozen: to the half (or, past it, the end),
// to the end, or until a defeat or the half/end, whichever comes first. Stops
// early wherever a single match would be refused.
export function playToTarget(week, until, rivals = 19) {
  const end = seasonWeeks(rivals), half = halfSeason(rivals);
  if (until === "end") return end;
  if (until === "next") return week;
  return week <= half ? half : end;
}

// One match, then any covered starter whose ban is now served goes back.
function playOne(state) {
  const next = playMatch(state);
  return next === state ? state : restoreCovers(next);
}

// With auto-cover on, each suspended starter's best fit comes in before the
// match instead of the run stopping (spec 08 §6).
function playTo(state, until) {
  if (state.phase !== "matchday" || !state.campaign) return state;
  const target = playToTarget(state.campaign.week, until, state.campaign.order.length);
  let current = state;
  while (current.phase === "matchday" && current.campaign.week <= target) {
    const ready = current.autoCover ? coverAll(current) : current;
    const next = playOne(ready);
    if (next === ready) break;
    current = next;
    if (until === "defeat" && current.campaign.log.at(-1).outcome === "L") break;
  }
  return current;
}

export function createReducer(dataset) {
  const getSquad = createSquadLookup(dataset);

  // Draws up to three distinct club-seasons from the era, each with the
  // players it can offer for the next empty slot. Squads with nobody left
  // are passed over so a draw is never a dead end.
  // The draft's archive: the division the career started in.
  const archiveFor = (league) => selectArchive(dataset, league);

  function land(state) {
    const eraIndex = selectEraIndex(archiveFor(state.league), state.eraMin, state.eraMax);
    if (eraIndex.length === 0) return state;
    const [rng, next] = takeRng(state);
    return { ...next, draw: { ...state.draw, spinning: false, options: deal(state, eraIndex, rng) } };
  }

  // In the bench stage every available player in a squad is on offer.
  function deal(state, eraIndex, rng) {
    const bench = selectDraftStage(state) === "bench";
    const idx = nextEmptySlotIndex(state.assignments);
    let slotType = "GK", side = null;
    if (idx >= 0) { slotType = state.assignments[idx].type; side = state.assignments[idx].side; }
    const want = Math.min(DRAW_OPTIONS, eraIndex.length);
    const seen = new Set();
    const options = [];
    for (let tries = 0; options.length < want && seen.size < eraIndex.length && tries < eraIndex.length * 4; tries++) {
      const entry = rng.pick(eraIndex);
      const key = `${entry.y}_${entry.c}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const { players, relaxed } = bench
        ? buildBenchPool(getSquad, entry.y, entry.c, state.draftedIds, state.draftedIdentities)
        : buildPool(getSquad, entry.y, entry.c, slotType, side, state.draftedIds, state.draftedIdentities);
      if (players.length === 0) continue;
      options.push({ year: entry.y, clubId: entry.c, label: entry.label, players, relaxed });
    }
    return options;
  }

  // "Fill the bench for me" (spec 08 §4.3): one draw from the career's
  // stream, then a deal per remaining pick from it.
  function fillBench(state) {
    if (selectDraftStage(state) !== "bench") return state;
    const eraIndex = selectEraIndex(archiveFor(state.league), state.eraMin, state.eraMax);
    const [rng, next] = takeRng(state);
    let current = { ...next, draw: idleDraw(state.draw) };
    for (let tries = 0; current.bench.length < BENCH_SIZE && tries < BENCH_SIZE * 20; tries++) {
      const player = fillPick(deal(current, eraIndex, rng), current.bench);
      if (player) current = addToBench(current, player);
    }
    return { ...current, draftDone: true };
  }

  // Window candidates come from the archive of the division you will play
  // in: the career's own era where that archive covers it, otherwise the
  // whole of it (a 1990s top-flight career relegated to the Championship
  // signs from the Championship's seasons).
  function windowArchive(division) {
    return archiveFor(division);
  }
  function windowEra(division, state) {
    const idx = archiveFor(division);
    if (selectEraIndex(idx, state.eraMin, state.eraMax).length > 0) return { eraMin: state.eraMin, eraMax: state.eraMax };
    return { eraMin: ERAS[division].min, eraMax: ERAS[division].max };
  }

  // A save from before the Championship (v5 and earlier) has no second
  // division yet: it gets the dataset's, less any club already in its own.
  function withDivisions(state) {
    if (state.other && state.reserve) return state;
    const taken = new Set(state.opponents.map((o) => o.name));
    const pool = [...dataset.championship.table, ...dataset.championship.reserve].filter((c) => !taken.has(c.name));
    return { ...state, other: pool.slice(0, DIVISION_CLUBS[CHAMPIONSHIP]), reserve: pool.slice(DIVISION_CLUBS[CHAMPIONSHIP]) };
  }

  return function reducer(state, action) {
    switch (action.type) {
      case "SET_LEAGUE": {
        if (state.phase !== "formation" || ![TOP, CHAMPIONSHIP].includes(action.league)) return state;
        return {
          ...makeInitialState(dataset, state.careerSeed, action.league),
          rngCounter: state.rngCounter,
          formationKey: state.formationKey,
          assignments: makeInitialAssignments(state.formationKey),
        };
      }
      case "SET_FORMATION": {
        return {
          ...makeInitialState(dataset, state.careerSeed, state.league ?? TOP),
          rngCounter: state.rngCounter,
          formationKey: action.key,
          assignments: makeInitialAssignments(action.key),
          eraMin: state.eraMin,
          eraMax: state.eraMax,
        };
      }
      case "SET_ERA": {
        return { ...state, eraMin: action.min, eraMax: action.max };
      }
      case "START_DRAFT": {
        return { ...state, phase: "draft" };
      }
      case "DRAW": {
        if (state.draftDone || state.draw.options.length > 0) return state;
        return { ...state, draw: { ...state.draw, spinning: true, options: [] } };
      }
      case "LAND": {
        if (state.draftDone) return state;
        return land(state);
      }
      case "REDRAW": {
        if (state.draftDone || state.draw.redrawsLeft <= 0 || state.draw.options.length === 0) return state;
        return land({ ...state, draw: { ...state.draw, redrawsLeft: state.draw.redrawsLeft - 1 } });
      }
      case "PICK_PLAYER": {
        const stage = selectDraftStage(state);
        if (stage === "done") return state;
        if (stage === "bench") {
          const next = addToBench({ ...state, draw: idleDraw(state.draw) }, action.player);
          return { ...next, draftDone: next.bench.length >= BENCH_SIZE };
        }
        const idx = nextEmptySlotIndex(state.assignments);
        const draftedIds = new Set(state.draftedIds);
        draftedIds.add(action.player.id);
        const draftedIdentities = [...state.draftedIdentities, playerIdentity(action.player)];
        const role = defaultRoleFor(state.assignments[idx].type);
        const duty = defaultDutyFor(role);
        const assignments = state.assignments.slice();
        assignments[idx] = { ...assignments[idx], player: action.player, role: role.key, duty };
        // The eleventh pick opens the bench stage, with its own two redraws.
        const xiDone = nextEmptySlotIndex(assignments) === -1;
        const draw = xiDone ? { ...idleDraw(state.draw), redrawsLeft: REDRAWS } : idleDraw(state.draw);
        return { ...state, assignments, draftedIds, draftedIdentities, draw };
      }
      case "FILL_BENCH": {
        return fillBench(state);
      }
      case "SKIP_TO_TACTICS": {
        return { ...state, phase: "tactics", draw: idleDraw(state.draw) };
      }
      case "SET_ROLE": {
        const assignments = state.assignments.map((a) => {
          if (a.slotId !== action.slotId) return a;
          const role = ROLES[a.type].find((r) => r.key === action.roleKey);
          const duty = role.duties.includes(a.duty) ? a.duty : defaultDutyFor(role);
          return { ...a, role: role.key, duty };
        });
        return { ...state, assignments };
      }
      case "SET_DUTY": {
        const assignments = state.assignments.map((a) => a.slotId === action.slotId ? { ...a, duty: action.duty } : a);
        return { ...state, assignments };
      }
      case "SET_SLIDER": {
        const assignments = state.assignments.map((a) => a.slotId === action.slotId ? { ...a, [action.key]: action.value } : a);
        return { ...state, assignments };
      }
      case "SET_INSTRUCTION": {
        return { ...state, instructions: { ...state.instructions, [action.key]: action.value } };
      }
      case "SET_STYLE": {
        const preset = STYLE_PRESETS.find((s) => s.key === action.key);
        if (!preset) return state;
        return { ...state, instructions: { ...preset.instructions }, selectedStyle: preset.key };
      }
      case "MOVE_PLAYER": {
        const x = clamp(action.x, 3, 97), y = clamp(action.y, 5, 95);
        const assignments = state.assignments.map((a) => a.slotId === action.slotId ? { ...a, pos: { x, y } } : a);
        return { ...state, assignments };
      }
      case "RESET_POSITIONS": {
        const template = FORMATIONS[state.formationKey].slots;
        const assignments = state.assignments.map((a) => {
          const t = template.find((s) => s.id === a.slotId);
          return t ? { ...a, pos: { x: t.x, y: t.y } } : a;
        });
        return { ...state, assignments };
      }
      case "SWAP_PLAYERS": {
        // Jobs, briefs and dials reset to the new slot's defaults: a striker's
        // jobs mean nothing in a full-back slot.
        const { fromKind, fromId, toKind, toId } = action;
        if (fromKind === "slot" && toKind === "slot") {
          if (fromId === toId) return state;
          const assignments = state.assignments.map((a) => ({ ...a }));
          const fromA = assignments.find((a) => a.slotId === fromId);
          const toA = assignments.find((a) => a.slotId === toId);
          const fromPlayer = fromA.player, toPlayer = toA.player;
          const resetFor = (type, player) => {
            if (!player) return { player: null, role: null, duty: null, sliderAtt: 50, sliderDef: 50 };
            const role = defaultRoleFor(type);
            return { player, role: role.key, duty: defaultDutyFor(role), sliderAtt: 50, sliderDef: 50 };
          };
          Object.assign(fromA, resetFor(fromA.type, toPlayer));
          Object.assign(toA, resetFor(toA.type, fromPlayer));
          return { ...state, assignments };
        }
        if (fromKind === "bench" && toKind === "slot") {
          return { ...state, ...benchToSlot(state, fromId, toId) };
        }
        if (fromKind === "slot" && toKind === "bench") {
          const assignments = state.assignments.map((a) => ({ ...a }));
          const bench = state.bench.map((b) => ({ ...b }));
          const fromA = assignments.find((a) => a.slotId === fromId);
          const benchEntry = bench[toId];
          const outgoingPlayer = fromA.player;
          const role = defaultRoleFor(fromA.type);
          Object.assign(fromA, { player: benchEntry.player, role: benchEntry.player ? role.key : null, duty: benchEntry.player ? defaultDutyFor(role) : null, sliderAtt: 50, sliderDef: 50 });
          bench[toId] = { player: outgoingPlayer, role: null, duty: null };
          return { ...state, assignments, bench };
        }
        return state;
      }
      case "START_SEASON": {
        if (state.phase !== "tactics") return state;
        // The one draw a season takes: the fixture order and the seed every
        // fixture, event and rival round derives from. Ratings stay hidden
        // through the draft and tactics phases; the reveal comes next.
        const [rng, next] = takeRng(state);
        const order = rng.shuffle(state.opponents).map((o) => o.name);
        const seed = rng.int(2 ** 32);
        return {
          ...next, phase: "reveal", simulation: null,
          campaign: { seed, order, week: 1, log: [] }, discipline: {},
          cohesionMemory: { ...state.cohesionMemory, signature: null, matches: 0 },
        };
      }
      case "KICKOFF": {
        if (state.phase !== "reveal" || !state.campaign) return state;
        return { ...state, phase: "matchday" };
      }
      case "PLAY_MATCH": {
        return playOne(state);
      }
      case "COVER_BAN": {
        const live = state.phase === "matchday" || (state.phase === "result" && state.playoffs && state.playoffs.stage !== "done");
        return live ? coverBan(state, action.slotId) : state;
      }
      case "PLAY_PLAYOFF": {
        return playPlayoff(state);
      }
      case "SET_AUTO_COVER": {
        return { ...state, autoCover: Boolean(action.on) };
      }
      case "PLAY_TO": {
        return playTo(state, action.until);
      }
      case "GOTO_TRANSFER": {
        if (state.playoffs && state.playoffs.stage !== "done") return state;
        const [rng, next] = takeRng(restoreCovers(withDivisions(state), true));
        const division = state.division ?? TOP;
        const table = state.simulation?.table;
        const playoffWinner = division !== CHAMPIONSHIP || !table ? null
          : state.playoffs ? state.playoffs.winner : rivalPlayoffs(table, state.opponents, state.campaign?.seed ?? 0).winner;
        const moved = table
          ? nextDivisions({ division, opponents: next.opponents, other: next.other, reserve: next.reserve, table, playoffWinner, rng })
          : { division, opponents: next.opponents, other: next.other, reserve: next.reserve, relegated: [], promoted: [], userMove: null };
        const shortlist = generateShortlist(getSquad, windowArchive(moved.division, state), windowEra(moved.division, state), state.draftedIds, rng, { ownedIdentities: state.draftedIdentities })
          .map((player) => ({ player, signed: false, cost: wageCost(player) }));
        const seasonHistory = state.simulation ? [...state.seasonHistory, summarizeSeason(state)] : state.seasonHistory;
        const transferBudget = { points: windowBudget(state.simulation?.position ?? DIVISION_CLUBS[division], DIVISION_CLUBS[division]), spent: 0 };
        const { relegated, promoted, wentUp, cameDown, userMove } = moved;
        return {
          ...next, phase: "transfer", shortlist, transferBudget,
          division: moved.division, opponents: moved.opponents, other: moved.other, reserve: moved.reserve,
          lastTransition: { relegated, promoted, ...(wentUp ? { wentUp, cameDown } : {}), userMove, division: moved.division },
          seasonHistory, campaign: null, discipline: {}, covers: [], playoffs: null,
        };
      }
      case "SIGN_SHORTLIST_TO_BENCH": {
        const signing = affordableSigning(state, action.index);
        if (!signing) return state;
        const bench = signToBench(state.bench, signing.entry.player);
        return { ...state, ...signing.changes, bench };
      }
      case "SIGN_SHORTLIST_TO_XI": {
        const signing = affordableSigning(state, action.index);
        if (!signing) return state;
        const { assignments, bench } = signToSlot(state.assignments, state.bench, action.slotId, signing.entry.player);
        return { ...state, ...signing.changes, assignments, bench };
      }
      case "CONTINUE_SEASON": {
        const [rng, next] = takeRng(state);
        const { assignments, bench, retired } = progressSquad(state.assignments, state.bench, rng);
        const lastTransition = { relegated: [], promoted: [], ...state.lastTransition, retired };
        return { ...next, phase: "tactics", season: state.season + 1, shortlist: [], simulation: null, assignments, bench, lastTransition };
      }
      case "NEW_GAME": {
        return makeInitialState(dataset, action.seed, action.league === CHAMPIONSHIP ? CHAMPIONSHIP : TOP);
      }
      case "LOAD_SAVE": {
        return withDivisions(action.state);
      }
      default: return state;
    }
  };
}
