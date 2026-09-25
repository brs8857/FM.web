# Changelog

## Unreleased

### Changed
- The tactics vocabulary: jobs and briefs (Hold / Link / Push) replace roles and duties, mentality runs Contain to All-out, cohesion (Clicking / Settled / Rough / Strangers) replaces tactical familiarity, and the neutral style is "Blank slate". The keys, weights and formulas behind them are unchanged.
- The page title is now "Era XI", the working name.
- The draft draws three club-seasons at a time with two redraws per draft, and the save format is version 2 (1.1.0 saves migrate). The current screens still show the first of the three.

### Added (behind `?layout=v2`)
- The redesign foundations: design tokens, bundled fonts, the primitive library and its gallery (`?layout=v2&gallery=1`), the chalkboard with keyboard control, the app shell, and a season-by-season record in the save. The screens follow in the next milestone.

## 1.1.0 — 2026-09-13

### Added
- Autosave on every device, with a **Continue career** card when you come back.
- **Export save** / **Import save** in the header menu, to move a career between devices.
- A crash screen that can export your saved career before starting over.
- Player data loads separately from the app, with a Retry button if it fails.

### Fixed
- Clubs relegated in a summer can no longer be promoted straight back.
- The draft says when a squad has no player for the slot, and marks off-position players.
- The same real player can no longer be in your squad twice from different seasons.
- Result tables from season 2 onwards no longer mention Fulham; the perfect-season text no longer contradicts itself.
- Dragging players on touch screens no longer swaps them straight back.

### Changed
- Every random event comes from a career seed, so a saved career always replays the same way.
- The code is split into data, engine, state and component modules, with unit, golden-master and browser tests in CI.
- CI runs on Node 24 and only deploys when every check passes.
