# FM.WEB Roadmap

_Created 2026-09-11. Living document: update it when a phase starts, ships, or changes scope._

The roadmap has three phases, taken in order. **A phase isn't finished until it's
shipped and tested** (see [Definition of done](#definition-of-done)). Each phase
gets its own design cycle before any code is written:

> brainstorm → written spec (`docs/superpowers/specs/`) → implementation plan → build → test → release

| Phase | Theme | Release | Status |
|---|---|---|---|
| 1 | Foundation, then Reach & Polish | v2.0 | **Next** |
| 2 | Deeper Career + Sharper Draft & Tactics | v3.0 | Waiting on Phase 1 |
| 3 | Match-Day Experience | v4.0 | Waiting on Phase 2 |

The starting point is v1.0 (commit `6495fb8`), which is live at https://brs8857.github.io/FM.web/.
The problems it starts from are listed in [code-review-2026-09-11.md](code-review-2026-09-11.md).

---

## Phase 1: Foundation, then Reach & Polish (v2.0)

### 1A. Foundation (first milestone, not visible to players)

Everything later depends on this. Today the whole game is one 2,316-line file with 940 KB of
data inline, no tests, and no saves.

- **Split `src/App.jsx`** into:
  - `data/`: player dataset and Championship pool as JSON, loaded on demand
  - `engine/`: pure modules (ratings, tactics profile, familiarity, simulation, promotion)
  - `state/`: reducer and actions
  - `components/`: one screen or widget per file
- **Tests** with Vitest for the engine and reducer, run in CI before every deploy.
- **Seeded random numbers**, replacing the biased `sort(() => Math.random() - 0.5)` shuffles.
  Runs become reproducible, which later phases need for daily and shareable seeds.
- **Save and resume**: a versioned save format in browser storage, so refreshing doesn't wipe a career.
- **Bug fixes from the review** that don't change game design:
  - Relegated clubs being promoted straight back the same summer
  - The draft pool quietly offering the wrong positions, which now needs to be shown clearly
  - The same real player being drafted or signed twice across seasons
  - Hard-coded "Fulham's place" and the "games to spare" text
  - Touch drag-and-drop running the drop twice
  - Leftover duplicate and dead code
- **Build the standalone HTML automatically** instead of committing a hand-made copy.

_Not in 1A:_ balance changes, rival-points logic, player progression. Those change
how the game plays and belong to Phase 2.

### 1B. Reach & Polish (visible release)

- **Mobile first**: rework layouts for phone screens, make touch dragging reliable, and
  test on real iOS Safari and Android Chrome.
- **Installable web app (PWA)**: manifest, icons, offline play, "Add to Home Screen".
- **Desktop app** built from the same code in CI, replacing the out-of-date Electron `.exe`.
  Electron or Tauri gets decided in the Phase 1 spec.
- **Accessibility**:
  - Allow pinch-zoom
  - Keyboard alternative to dragging players
  - Contrast fixes
  - Screen-reader labels
  - Reduced-motion support
- **Onboarding**: a first-run walkthrough of draft → tactics → season, plus clearer in-game help.
- **UI polish**: consistent Tailwind styling (removing leftover inline styles),
  loading and error states, and an error boundary so a crash doesn't blank the page.
- **Performance**: lazy-load the dataset, set a size budget for the first download.
- **Housekeeping**:
  - A LICENSE
  - A check on data provenance and terms (the club IDs look like Transfermarkt's)
  - An updated README

**Exit criteria**
- The engine has test coverage and CI must pass before every deploy.
- Saves survive refresh and a browser restart.
- Manually tested on iOS Safari, Android Chrome, desktop Chrome/Edge/Firefox and the Windows desktop app.
- Lighthouse scores meet the targets set in the spec (PWA installable, accessibility ≥ 90).

---

## Phase 2: Deeper Career + Sharper Draft & Tactics (v3.0)

### Career depth
- **A real league**: all 20 clubs play every fixture, so the table matches the results.
  This fixes rival points that ignore your results and a points total inflated by about 12%.
- **Relegation for you too**: your club can go down and play in the Championship, and win promotion back.
- **Players change over time**: ageing, development, decline and retirement.
- **Familiarity grows** the longer you keep a system, and drops when you change it.
- **Transfer market**: budget and valuations replace five random free signings.
  Squad limits, and no more silently dropping bench players.
- **Longer or open-ended careers**, with season history and a trophy cabinet.

### Draft & tactics
- **Rebalance the styles.** Today Low Block Counter wins the title 88% of the time
  against 4% for Park the Bus with the same squad. Target a spread where no style dominates,
  checked by an automated balance simulation in CI.
- **Matchups**: opponents get their own styles, so some styles beat others and the right pick depends on the opponent.
- **Consistent hidden-ratings rules**: decide what's hidden and when, and stop the stat pips giving it away.
- **Difficulty levels** and **challenge modes** (era-locked, budget XI, and so on).
- **Daily seeded draft** and **shareable result cards and seed codes**, which rely on the Phase 1 seeded randomness.

**Prerequisite:** recover or rebuild the data pipeline (`build_final.py` and the raw source data).
It's needed to re-tune ratings and to add Championship squads.

**Exit criteria:** the balance sim meets agreed thresholds, the career runs 10+ seasons
without errors, and old saves load or are cleanly rejected with a clear message.

---

## Phase 3: Match-Day Experience (v4.0)

- **Event-based match engine**: minute-by-minute events (chances, goals, cards, injuries) from
  both teams' profiles. It builds on Phase 2's match-by-match league.
- **Live match view**: a 2D pitch and/or commentary feed with speed controls and highlights.
- **In-match management**: tactical changes, substitutions, shouts.
- **Consequences**: injuries, suspensions, fitness, and player match ratings that feed back into the career.

**Exit criteria:** match results stay statistically in line with Phase 2's
simulation, a full season is playable at "watch key moments" speed, and it performs well on mid-range phones.

---

## Definition of done

A phase counts as shipped and tested when:

1. All scoped work is merged to `main` and deployed to GitHub Pages (and desktop builds published, from Phase 1 on).
2. Automated tests and CI pass.
3. The manual test checklist in that phase's spec is complete on the target devices.
4. A release is tagged (`v2.0`, `v3.0`, `v4.0`) with release notes.
5. **You have played it and signed it off.**

## Open questions to settle in each phase's brainstorm

- **Phase 1:**
  - Electron or Tauri for desktop?
  - What should the offline-first behaviour be?
  - Onboarding: a tutorial or contextual tips?
  - Do existing v1 games need migrating? There are no saves today, so probably not.
- **Phase 2:**
  - Is the source data for `build_final.py` recoverable?
  - Transfer economy: realistic money or abstract points?
  - How long should a career be?
- **Phase 3:**
  - 2D visual match or text commentary first?
  - How much control during a match?
