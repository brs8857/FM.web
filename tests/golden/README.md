# Golden-master files

Recorded by `scripts/capture-golden.mjs` from the v1 engine (`6495fb8`).
They prove the refactor doesn't change the game.

- `xis.json` — 20 seeded XIs (inputs). Never changes.
- `profiles.json` — familiarity, team profile and readout for every XI × 7 styles. Unchanged through Phase 1;
  re-recorded in C5 (see below).
- `seasons.json`, `league.json` — seeded season simulations and promotion/relegation.
  Re-recorded only by Task 10 (explicit rng + Fisher–Yates) and Task 22 (bug #1),
  each in a commit containing just the regenerated files and the responsible change.
  Task 25 may also re-record them, but only as a contingency, and only if a
  re-recorded season ever reaches 38 wins (today's recordings peak at 34).
  Re-recorded 2026-09 by `npm run golden:engine` when the engine switched to an
  explicit seeded rng and Fisher–Yates shuffles (Task 10).
  Re-recorded 2026-09-25 (plan C1) when the league became real: every rival
  fixture is simulated, so the rivals' points, the table order and every row's
  record and weekly points changed; the user's fixture list is unchanged.
  Re-recorded 2026-09-26 (plan C5) by `npm run golden:engine`, which now derives
  every file but `xis.json` from the current engine: the balance tuning moved
  `compress`, `executionMultiplier`, the dial trade-offs, the identity bonuses
  and five presets, so every profile changed (familiarity by a point for the
  retuned presets) and the season inputs were re-derived from the same 20 XIs
  and seeds. `profiles.json` changes with the tuning; `seasons.json` and
  `league.json` in the commit after it, with the balance table.
  Re-recorded 2026-09-26 (plan F1) when the season became playable one fixture
  at a time: `simulateSeason` still draws the fixture order from its rng, then a
  season seed, and every fixture, event and rival round derives its own stream
  from that seed and its week (`fixtureRng`, `eventRng`, `roundRng`). Same XIs,
  profiles, fixture lists and `simulateMatch`; different draws, so every result
  and table changed, and `league.json` with the tables. `profiles.json` did not
  change.

Re-recorded 2026-09-26 (AI-tells audit follow-up): the Board readout was
  rewritten in the game's own voice and `seasonTier` now returns only the
  key a verdict is filed under (its unused `sub` copy and Tailwind `color`
  names are gone; `content/labels.js` has the display copy). Only
  `profiles.json` readout strings and the `tier` objects in `seasons.json`
  changed; every number and `league.json` are identical.

Compare through `JSON.parse(JSON.stringify(value))` — `toEqual` distinguishes `-0` from `0`.
