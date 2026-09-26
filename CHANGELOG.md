# Changelog

## 2.7.0 — 2026-09-26

Match day, part 1: the season is played one fixture at a time.

### Added
- **Match day.** After the reveal the Season tab shows where you stand in the live table, the last match's report, and the next fixture: the opponent's standing, your strengths against theirs, and what your cohesion is for this match. **Play week 12: Arsenal (A)** sits in the sticky bar on the Season, Board and Squad tabs (K on a keyboard), and the board, dials, jobs and XI are read afresh before every fixture.
- **Match reports.** Every match has a report: the score, who scored and when (stoppage time as 90+2'), the identity, cohesion and mentality you played it with, and where it left you in the table. Scorers are credited from the score, weighted by each starter's attacking job, brief and position, so the season's top scorer is a consequence of the board.
- **Play to…** the half, the next defeat or the end of the season: the run is played with the board as it stands and typed in on the vidiprinter, with the half-season stop when it crosses week 19. Watched, a whole season takes as long as the old vidiprinter; Skip or reduced motion makes it instant.
- **Settling.** A system just changed (or a season's first match) costs 3 cohesion, then 2, then 1, and nothing from the fourth match in a row in it. Changing style, lean or shape every week is no longer free; keeping one system is worth what it always was.
- **Cards and bans.** Bookings come with the tackling dial (Aggressive gets about 40% more than the midpoint); a red card or a fifth yellow bans the player for the next match. A banned starter must be swapped out from the Squad tab before you can play ("Replace Adams (suspended)"); with nobody free on the bench the side plays a man short. Bans clear between seasons.
- **The record remembers every match.** Each season in Club › Record opens to its form, its top scorers and all 38 reports; the career adds its top scorer and biggest win. The back page and the share slip name the season's top scorer.
- `npm run sim -- --assert` also checks that changing the system every week, or leaning deeper against the strongest sides, never out-points keeping one system.

### Changed
- The save format is version 4. Saves from 2.5.0, 2.0.0 and 1.1.0 migrate. **A save paused at the ratings reveal restarts that season from kick-off**: its results had been drawn at once and never seen, and are now drawn fixture by fixture, so they will differ. A save on a back page keeps its results (without scorers), and seasons already in the record show "No match log".
- Every fixture, its events and every rival round now draw from the season's own seed, so nothing done between matches changes a result. The balance table is unchanged beyond sampling noise.
- On phones the sticky action bar no longer sits under the tab bar.

## 2.5.0 — 2026-09-26

Career depth, part 1: a career now changes from season to season, and the
styles are rebalanced against a real league.

### Added
- **Your colours.** A third New career step (and a Colours setting) picks the club you follow; its two kit colours become the whole theme, paper, ink and chalkboard included, in light and dark. Every club's derived theme is checked against the same WCAG AA pairs as the default theme, which stays as it is until a club is chosen. The gallery previews any club.
- **A real league.** All 380 fixtures are played; every club's record, goals and week-by-week points are real, so the table always matches the results and the vidiprinter's running position follows the real table.
- **Ageing.** Every summer the squad is a year older: players develop into their mid-twenties, plateau, then decline from 30 with pace going first. Anyone who reaches 36 retires, the bench first, and a retiring starter's place goes to the best bench fit. Pre-season names who has gone.
- **Cohesion memory.** Keeping the same formation and identity is worth +2 cohesion a season, up to +8; changing it costs 4 for that season.
- **A budget for the window.** Eight candidates instead of five, each costing one to five wage points by rating; the budget comes from last season's finish (nine for the champions, five for a club in the bottom three).
- `npm run sim -- --assert`, run in CI: every style must keep its best-draft title odds between 12% and 45% and its random-draft relegation odds between 3% and 12%.
- `scripts/derive-ratings.mjs` and `npm run data:check` rebuild the rating derivation described in `docs/data.md`.

### Changed
- The default theme moves from warm newsprint beige to a neutral grey and white base with pitch green as the accent.
- **The balance.** Under the real league a well-drafted Low Block Counter won the title 97% of the time and an ordinary squad was almost never in danger. Every style now wins a title with a strong draft between roughly 13% and 38% of the time, and an ordinary squad finishes mid-table with a real chance of going down. Most tactical dials are now trade-offs between attack and defence rather than free attack, the identity bonuses are resized, and five style presets start from a less extreme mentality.
- The save format is version 3. Saves from 2.0.0 and 1.1.0 migrate: ages carry over and start moving next summer, cohesion memory is rebuilt from the seasons already played, and an open window gets the budget its finish earns.

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
