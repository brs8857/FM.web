// @vitest-environment node
import { describe, it, expect } from "vitest";
import { makeMiniDataset } from "../fixtures/miniDataset.js";
import { playCareer, coverBans, driver } from "../fixtures/playCareer.js";
import { createReducer, lineupFor } from "../../src/state/reducer.js";
import { makeInitialState } from "../../src/state/initialState.js";
import { takeRng } from "../../src/state/rngState.js";
import { afterMatch } from "../../src/engine/familiarity.js";
import { playSeason, simulateSeason, leagueTable } from "../../src/engine/season.js";

const dataset = makeMiniDataset();
const reducer = createReducer(dataset);

function run(seed) {
  return playCareer({ reducer, initialState: makeInitialState(dataset, seed) });
}

const scores = (matches) => matches.map(({ week, opponent, home, gf, ga, outcome }) => ({ week, opponent, home, gf, ga, outcome }));
const totals = ({ w, d, l, gf, ga, pts, position, tier, table }) => ({ w, d, l, gf, ga, pts, position, tier, table });

// Season 1 at kick-off, and the same season played match by match (with the
// board each fixture was played with) and by Play to…, a ban covered by a
// swap from the bench wherever one stops play.
function seasonOne(seed) {
  const tactics = playCareer({ reducer, initialState: makeInitialState(dataset, seed), seasons: 0 });
  const day = reducer(reducer(tactics, { type: "START_SEASON" }), { type: "KICKOFF" });
  const step = driver(reducer, day);
  const boards = [];
  while (step.last().phase === "matchday") {
    coverBans(step.last(), step);
    boards.push(step.last());
    step({ type: "PLAY_MATCH" });
  }
  const fast = driver(reducer, day);
  fast({ type: "PLAY_TO", until: "half" });
  while (fast.last().phase === "matchday") {
    coverBans(fast.last(), fast);
    fast({ type: "PLAY_TO", until: "end" });
  }
  return { tactics, day, boards, stepped: step.last(), fast: fast.last() };
}

describe("reducer determinism", () => {
  it("replays an identical six-season career from the same seed", () => {
    expect(run(2024)).toEqual(run(2024));
  });

  it("produces a different career from a different seed", () => {
    expect(run(1).simulation.matches).not.toEqual(run(2).simulation.matches);
  });
});

describe("batch equivalence", () => {
  it.each([7, 4242, 90210])("PLAY_MATCH × 38, PLAY_TO and playSeason agree for seed %i", (seed) => {
    const { boards, stepped, fast } = seasonOne(seed);
    expect(stepped.phase).toBe("result");
    expect(boards).toHaveLength(38);
    expect(JSON.stringify(fast)).toBe(JSON.stringify(stepped));

    // The batch, fed each fixture's board as the reducer read it.
    const batch = playSeason((fixture) => lineupFor(boards[fixture.week - 1]), stepped.opponents, stepped.campaign.order, stepped.campaign.seed);
    expect(JSON.stringify(scores(stepped.simulation.matches))).toBe(JSON.stringify(scores(batch.matches)));
    expect(JSON.stringify(totals(stepped.simulation))).toBe(JSON.stringify(totals(batch)));
  });

  it.each([7, 4242, 90210])("while the board is untouched, is the batch season fed one board with settling (seed %i)", (seed) => {
    // Every week up to the first swap a ban forced, the board is the one set
    // at kick-off, so the batch with that one board agrees exactly.
    const { day, boards, stepped } = seasonOne(seed);
    const untouched = boards.findIndex((b) => b.assignments !== day.assignments);
    const weeks = untouched < 0 ? 38 : untouched;
    expect(weeks).toBeGreaterThanOrEqual(1);
    let memory = day.cohesionMemory;
    const batch = playSeason(() => {
      const lineup = lineupFor({ ...day, cohesionMemory: memory });
      memory = afterMatch(memory, lineup.settle);
      return lineup;
    }, day.opponents, day.campaign.order, day.campaign.seed);
    expect(JSON.stringify(scores(stepped.simulation.matches.slice(0, weeks)))).toBe(JSON.stringify(scores(batch.matches.slice(0, weeks))));
    expect(JSON.stringify(leagueTable(day.opponents, day.campaign.order, stepped.simulation.matches.slice(0, weeks), day.campaign.seed)))
      .toBe(JSON.stringify(leagueTable(day.opponents, day.campaign.order, batch.matches.slice(0, weeks), day.campaign.seed)));
  });

  it("draws the order and the seed as the batch wrapper does, and takes nothing more all season", () => {
    const { tactics, stepped } = seasonOne(31);
    const [rng] = takeRng(tactics);
    const order = rng.shuffle(tactics.opponents).map((o) => o.name);
    const seed = rng.int(2 ** 32);
    expect(stepped.campaign).toMatchObject({ order, seed });
    expect(stepped.rngCounter).toBe(tactics.rngCounter + 1);
    const { profile, familiarity } = lineupFor({ ...tactics, cohesionMemory: { ...tactics.cohesionMemory, signature: null, matches: 0 } });
    const [again] = takeRng(tactics);
    expect(simulateSeason(profile, familiarity, tactics.opponents, again).matches.map((m) => m.opponent)).toEqual(stepped.simulation.matches.map((m) => m.opponent));
  });

  it("gives the same results whatever is done between matches, as long as the board ends up the same", () => {
    const { day, stepped } = seasonOne(4242);
    const fiddled = driver(reducer, day);
    while (fiddled.last().phase === "matchday") {
      fiddled({ type: "SET_INSTRUCTION", key: "mentality", value: 5 });
      fiddled({ type: "SET_INSTRUCTION", key: "mentality", value: day.instructions.mentality });
      coverBans(fiddled.last(), fiddled);
      fiddled({ type: "PLAY_MATCH" });
    }
    expect(fiddled.last().simulation.matches).toEqual(stepped.simulation.matches);
  });
});
