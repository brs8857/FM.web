# FM.WEB Roadmap

_Created 2026-09-11. Updated 2026-09-25 (redesign and commercial release series). Living document: update it when a phase starts, ships, or changes scope._

**A phase isn't finished until it's shipped and tested** (see [Definition of done](#definition-of-done)).
Each phase gets its own design cycle before any code is written:

> brainstorm → written spec (`docs/superpowers/specs/`) → implementation plan → build → test → release

| Phase | Theme | Release | Status |
|---|---|---|---|
| 1A | Foundation | v1.1 | Shipped 2026-09-13 |
| 1B | ~~Reach & Polish~~ → **Redesign** ("Back page and chalkboard") | v2.0 | Owner approved 2026-09-25; milestone A (foundations) built behind `?layout=v2`, milestone B (screens) next |
| 1C | Career depth, part 1 (moved forward from Phase 2) | v2.5 | Specced in 06 §1; waiting on 1B |
| 1D | App Store release (free + one-time unlock) | v3.0 | Specced in 05; waiting on 1C |
| 2 | Deeper Career + Sharper Draft & Tactics (remainder) | v4.0 | Waiting on 1D |
| 3 | Match-Day Experience | v5.0 | Waiting on Phase 2 |

The starting point is v1.0 (commit `6495fb8`), which is live at https://brs8857.github.io/FM.web/.
The problems it starts from are listed in [code-review-2026-09-11.md](code-review-2026-09-11.md).

## Redesign and commercial release series

_Added 2026-09-25. Supersedes the "UI polish" item under Phase 1B and the layout
sections (§5) of the Phase 1 design spec. Everything UI-related now flows through spec 04._

Six specs and one plan, read in order:

| # | Document | What it decides |
|---|---|---|
| 01 | [Design research](superpowers/specs/2026-09-25-01-design-research.md) | The design theory for a draft-and-career sim, as a checklist of design tests |
| 02 | [Gap analysis](superpowers/specs/2026-09-25-02-gap-analysis.md) | Where v1.1 fails those tests, by file and mechanic (G1–G15) |
| 03 | [Competitive research](superpowers/specs/2026-09-25-03-competitive-research.md) | Comparable games; what reads as a copy; the rename and rights review |
| 04 | [UI redesign](superpowers/specs/2026-09-25-04-ui-redesign.md) | Visual identity, information architecture, screens, accessibility, component plan |
| 05 | [Commercial readiness](superpowers/specs/2026-09-25-05-commercial-readiness.md) | Capacitor, free + non-consumable IAP, no accounts, iCloud sync, App Review items, compliance |
| 06 | [Viability extras](superpowers/specs/2026-09-25-06-commercial-viability-extras.md) | Career depth before charging, telemetry, localisation, retention, channels, review blockers |
| Plan | [Redesign and App Store plan](superpowers/plans/2026-09-25-redesign-and-app-store.md) | Milestones A–E, tasks, and the consolidated owner-decision table |

**Nothing in the plan starts until the owner has reviewed the decision table in the plan's §2.**
Decisions Apple's rules force (in-app purchase for the unlock, the $99/yr programme, no
required login) are marked ⚠ there.

---

## Phase 1: Foundation, then Reach & Polish (v2.0)

**Design spec:** [2026-09-11-phase-1-design.md](superpowers/specs/2026-09-11-phase-1-design.md), approved 2026-09-11.
The foundation ships first as v1.1.

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

### 1B. Reach & Polish → Redesign (visible release)

_Superseded 2026-09-25._ The "UI polish" item below (consistent Tailwind styling, loading and
error states) is withdrawn; there is no incremental polish pass. The mobile-first,
accessibility and installable-app goals stay, but they are now requirements of the clean-slate
redesign in [spec 04](superpowers/specs/2026-09-25-04-ui-redesign.md) (§6 layout, §8 accessibility
and native feel) and are delivered by milestones A–B of the
[plan](superpowers/plans/2026-09-25-redesign-and-app-store.md). The Phase 1 spec's §6 (saves) and
§7 (PWA, standalone build, performance, errors) still apply unchanged. The items below are kept
for the record.

- **Mobile first**: rework layouts for phone screens, make touch dragging reliable, and
  test on real iOS Safari and Android Chrome.
- **Installable web app (PWA)**: manifest, icons, offline play, "Add to Home Screen".
- **Desktop browsers are first-class**, with the big-screen tactics board polished.
  _Decided 2026-09-11: there's no separate desktop app. The PWA installs from Chrome and Edge on
  desktop, and the out-of-date Electron `.exe` is retired._
- **Accessibility**:
  - Allow pinch-zoom
  - Keyboard alternative to dragging players
  - Contrast fixes
  - Screen-reader labels
  - Reduced-motion support
- **Onboarding**: _decided 2026-09-11: not in Phase 1._ The existing in-screen help stays; revisit if players get confused.
- ~~**UI polish**: consistent Tailwind styling (removing leftover inline styles),
  loading and error states, and an error boundary so a crash doesn't blank the page.~~
  _Withdrawn 2026-09-25; replaced by the redesign (spec 04). The error boundary shipped in v1.1._
- **Performance**: lazy-load the dataset, set a size budget for the first download.
- **Housekeeping**:
  - A LICENSE
  - A check on data provenance and terms (the club IDs look like Transfermarkt's)
  - An updated README

**Exit criteria**
- The engine has test coverage and CI must pass before every deploy.
- Saves survive refresh and a browser restart.
- Manually tested on iOS Safari, Android Chrome and desktop Chrome/Edge/Firefox.
- Lighthouse scores meet the targets set in the spec (PWA installable, accessibility ≥ 90).

---

### 1C. Career depth, part 1 (v2.5) and 1D. App Store release (v3.0)

_Added 2026-09-25._ A paid career has to differ from season to season, so a subset of Phase 2
moves ahead of the App Store release: a real league, ageing, cohesion memory, a constrained
transfer window and a balance threshold in CI ([spec 06 §1](superpowers/specs/2026-09-25-06-commercial-viability-extras.md)).
The App Store release then wraps the web app with Capacitor, sells a single non-consumable
unlock, and keeps the web build as the free tier ([spec 05](superpowers/specs/2026-09-25-05-commercial-readiness.md)).
Tasks are milestones C–E of the plan. The items marked _(moved to 1C)_ below are no longer Phase 2 work.

---

## Phase 2: Deeper Career + Sharper Draft & Tactics (v4.0)

### Career depth
- **A real league**: all 20 clubs play every fixture, so the table matches the results.
  This fixes rival points that ignore your results and a points total inflated by about 12%. _(moved to 1C)_
- **Relegation for you too**: your club can go down and play in the Championship, and win promotion back.
- **Players change over time**: ageing, development, decline and retirement. _(moved to 1C)_
- **Familiarity grows** the longer you keep a system, and drops when you change it. _(moved to 1C, as "cohesion")_
- **Transfer market**: budget and valuations replace five random free signings.
  Squad limits, and no more silently dropping bench players. _(abstract wage points moved to 1C; realistic money stays here)_
- **Longer or open-ended careers**, with season history and a trophy cabinet. _(the record book ships in v2.0; open-ended careers stay here)_

### Draft & tactics
- **Rebalance the styles.** Today Low Block Counter wins the title 88% of the time
  against 4% for Park the Bus with the same squad. Target a spread where no style dominates,
  checked by an automated balance simulation in CI. _(moved to 1C)_
- **Matchups**: opponents get their own styles, so some styles beat others and the right pick depends on the opponent.
- **Consistent hidden-ratings rules**: decide what's hidden and when, and stop the stat pips giving it away. _(decided in spec 04 U3; ships in v2.0)_
- **Difficulty levels** and **challenge modes** (era-locked, budget XI, and so on). _(challenge modifiers are planned for v3.x, spec 06 §4; difficulty levels stay here)_
- **Daily seeded draft** and **shareable result cards and seed codes**, which rely on the Phase 1 seeded randomness. _(share cards and career codes ship in v2.0; the daily draw in v3.x)_

**Prerequisite:** recover or rebuild the data pipeline (`build_final.py` and the raw source data).
It's needed to re-tune ratings and to add Championship squads.

**Exit criteria:** the balance sim meets agreed thresholds, the career runs 10+ seasons
without errors, and old saves load or are cleanly rejected with a clear message.

---

## Phase 3: Match-Day Experience (v5.0)

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

1. All scoped work is merged to `main` and deployed to GitHub Pages (and, from v3.0, released on the App Store).
2. Automated tests and CI pass.
3. The manual test checklist in that phase's spec is complete on the target devices.
4. A release is tagged (`v2.0`, `v2.5`, `v3.0`, `v4.0`, `v5.0`) with release notes.
5. **You have played it and signed it off.**

## Open questions to settle in each phase's brainstorm

- **Phase 1B–1D (answered with defaults in the specs; owner to confirm or override):**
  - See the consolidated decision table in the [plan §2](superpowers/plans/2026-09-25-redesign-and-app-store.md#2-owner-decisions-consolidated). The ones with the widest consequences: the product name (C1), the three-cutting draw (U1), dropping Tailwind (U4), Capacitor (A1), free + non-consumable unlock (A2), price (A4), no accounts (A6), and moving career depth ahead of the App Store (X1).
  - Owner actions outside the code: trade-mark search for the new name, the rights review of club and player names and the dataset (03 §5), Apple Developer Program enrolment.
- **Phase 1 (original):**
  - What should the offline-first behaviour be?
  - Do existing v1 games need migrating? There are no saves today, so probably not.
- **Phase 2:**
  - Is the source data for `build_final.py` recoverable?
  - Transfer economy: realistic money or abstract points?
  - How long should a career be?
- **Phase 3:**
  - 2D visual match or text commentary first?
  - How much control during a match?
