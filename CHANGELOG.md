# Changelog

## Unreleased

### Added
- **Your colours.** A third New career step (and a Colours setting) picks the club you follow; its two kit colours become the whole theme, paper, ink and chalkboard included, in light and dark. Every club's derived theme is checked against the same WCAG AA pairs as the default pitch theme, which stays as it is until a club is chosen. The gallery previews any club.

## 2.0.0 — 2026-09-25

The "Back page and chalkboard" redesign, now called **Era XI**. Every
screen is new; the engine and the balance are unchanged.

### Added
- **The draw.** Each pick draws three club-seasons as cuttings; open one to see its team sheet in shirt order (never by rating) and confirm a pick with its cohesion cost shown first. Two redraws per draft. The draft can be paused from any pick.
- **Home** with a resume card that names the one next action, plus Saves, Settings and About sheets; three first-run slips instead of a tutorial; a dismissable coach's note on each tab.
- **Squad tab**: the team sheet and a player sheet with stats as five bands and no numbers (the overall appears only at the reveal), job, brief, the two personal dials and Swap with….
- **Board tab**: identity and cohesion first, a style row, the three approach dials, the other eight and three switches in two collapsed groups with summaries, strengths bars ticked at the rivals' average, every term explained on tap, keyboard control of the chalkboard.
- **Season tab**: pre-season, the ratings reveal, the vidiprinter (Pause, Skip, a half-season slip), the back page with Share (a 1080×1350 slip for the system share sheet), and the window with Replace highlighting eligible slots on the board.
- **Club tab**: the season-by-season record, your career code (start any career from someone else's code), export and import, settings (theme, motion, haptics, club names), about.
- Installable as an app with offline play and an update prompt; a single-file standalone build; light and dark themes; keyboard shortcuts (1–4, K, D); reduced motion; a zoomable viewport; axe-clean screens.
- MIT licence for the code, `docs/data.md` on the dataset.

### Changed
- The tactics vocabulary: jobs and briefs (Hold / Link / Push) replace roles and duties, mentality runs Contain to All-out, cohesion (Clicking / Settled / Rough / Strangers) replaces tactical familiarity, and the neutral style is "Blank slate". The keys, weights and formulas behind them are unchanged.
- Club-seasons are keyed by name slugs rather than the old numeric ids; the save format is version 2 and 1.1.0 saves migrate, including their keys.
- Export files are named `era-xi-season…`; the previous UI, Tailwind and the layout flag are gone.

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
