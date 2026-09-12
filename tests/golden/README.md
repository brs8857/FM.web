# Golden-master files

Recorded by `scripts/capture-golden.mjs` from the v1 engine (`6495fb8`).
They prove the refactor doesn't change the game.

- `xis.json` — 20 seeded XIs (inputs). Never changes.
- `profiles.json` — familiarity, team profile and readout for every XI × 7 styles. **Never changes in Phase 1.**
- `seasons.json`, `league.json` — seeded season simulations and promotion/relegation.
  Re-recorded only by Task 10 (explicit rng + Fisher–Yates) and Task 22 (bug #1),
  each in a commit containing just the regenerated files and the responsible change.
  Task 25 may also re-record them, but only as a contingency, and only if a
  re-recorded season ever reaches 38 wins (today's recordings peak at 33).
  Re-recorded 2026-09 by `npm run golden:engine` when the engine switched to an
  explicit seeded rng and Fisher–Yates shuffles (Task 10).

Compare through `JSON.parse(JSON.stringify(value))` — `toEqual` distinguishes `-0` from `0`.
