# Golden-master files

Recorded by `scripts/capture-golden.mjs` from the v1 engine (`6495fb8`).
They prove the refactor doesn't change the game.

- `xis.json` — 20 seeded XIs (inputs). Never changes.
- `profiles.json` — familiarity, team profile and readout for every XI × 7 styles. **Never changes in Phase 1.**
- `seasons.json`, `league.json` — seeded season simulations and promotion/relegation.
  Re-recorded only by Task 10 (explicit rng + Fisher–Yates) and Task 22 (bug #1),
  each in a commit containing just the regenerated files and the responsible change.

Compare through `JSON.parse(JSON.stringify(value))` — `toEqual` distinguishes `-0` from `0`.
