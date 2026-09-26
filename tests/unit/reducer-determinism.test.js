// @vitest-environment node
import { describe, it, expect } from "vitest";
import { makeMiniDataset } from "../fixtures/miniDataset.js";
import { playCareer } from "../fixtures/playCareer.js";
import { createReducer, lineupFor } from "../../src/state/reducer.js";
import { makeInitialState } from "../../src/state/initialState.js";
import { takeRng } from "../../src/state/rngState.js";
import { afterMatch } from "../../src/engine/familiarity.js";
import { playSeason, simulateSeason } from "../../src/engine/season.js";

const dataset = makeMiniDataset();
const reducer = createReducer(dataset);

function run(seed) {
  return playCareer({ reducer, initialState: makeInitialState(dataset, seed) });
}

const scores = (matches) => matches.map(({ week, opponent, home, gf, ga, outcome }) => ({ week, opponent, home, gf, ga, outcome }));
const totals = ({ w, d, l, gf, ga, pts, position, tier, table }) => ({ w, d, l, gf, ga, pts, position, tier, table });

// Season 1 at the moment it kicks off, and the same season played the three ways.
function seasonOne(seed) {
  const tactics = playCareer({ reducer, initialState: makeInitialState(dataset, seed), seasons: 0 });
  const day = reducer(reducer(tactics, { type: "START_SEASON" }), { type: "KICKOFF" });
  let stepped = day;
  for (let i = 0; i < 38; i++) stepped = reducer(stepped, { type: "PLAY_MATCH" });
  const fast = reducer(reducer(day, { type: "PLAY_TO", until: "half" }), { type: "PLAY_TO", until: "end" });
  return { tactics, day, stepped, fast };
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
  it.each([7, 4242, 90210])("PLAY_MATCH × 38, PLAY_TO twice and playSeason agree for seed %i", (seed) => {
    const { day, stepped, fast } = seasonOne(seed);
    expect(stepped.phase).toBe("result");
    expect(JSON.stringify(fast)).toBe(JSON.stringify(stepped));

    // The batch, fed the same board week by week (the settling moves cohesion
    // as the matches go by, exactly as the reducer applies it).
    let memory = day.cohesionMemory;
    const batch = playSeason(() => {
      const lineup = lineupFor({ ...day, cohesionMemory: memory });
      memory = afterMatch(memory, lineup.settle);
      return lineup;
    }, day.opponents, day.campaign.order, day.campaign.seed);
    expect(JSON.stringify(scores(stepped.simulation.matches))).toBe(JSON.stringify(scores(batch.matches)));
    expect(JSON.stringify(totals(stepped.simulation))).toBe(JSON.stringify(totals(batch)));
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
    let fiddled = day;
    for (let i = 0; i < 38; i++) {
      fiddled = reducer(fiddled, { type: "SET_INSTRUCTION", key: "mentality", value: 5 });
      fiddled = reducer(fiddled, { type: "SET_INSTRUCTION", key: "mentality", value: day.instructions.mentality });
      fiddled = reducer(fiddled, { type: "PLAY_MATCH" });
    }
    expect(fiddled.simulation.matches).toEqual(stepped.simulation.matches);
  });
});
