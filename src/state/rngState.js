import { createRng, deriveSeed } from "../engine/rng.js";

export function newCareerSeed() {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

// Every random decision takes the next counter value, so a saved career
// always replays the same way.
export function takeRng(state) {
  const rng = createRng(deriveSeed(state.careerSeed, state.rngCounter));
  return [rng, { ...state, rngCounter: state.rngCounter + 1 }];
}
