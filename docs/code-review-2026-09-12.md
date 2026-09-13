# FM.WEB — Code Review (2026-09-12)

Baseline: `main` @ `50433e1`. Line numbers refer to `src/App.jsx` unless stated.
Follows on from [code-review-2026-09-11.md](code-review-2026-09-11.md); known issues from that
review are not re-reported except where checking them turned up something new.

Each finding is tagged **Verified (sim)** — reproduced by running the engine's functions
headlessly against the real dataset; **Verified (reading)** — confirmed from the code alone;
or **Speculation**.

## 1. Architecture overview

**Shape of the file.** `src/App.jsx` is 2,316 lines / 1.08 MB, but 88% of the bytes are two
lines: line 7 (`DATASET`, 940 KB) and line 776 (`CHAMPIONSHIP_POOL`, 2.2 KB). The remaining
~1,370 lines break down as:

| Lines | Layer | Contents |
|---|---|---|
| 9–29 | Data access | `rowToPlayer`, `getSquad`, `clamp`, `seasonLabel` |
| 38–52 | Tuning curves | `compress`, `executionMultiplier` |
| 56–301 | Static tables | `FORMATIONS` (7), `ROLES` (8 slot types × 2–5 roles), `DUTY_INFO`, `DEFAULT_INSTRUCTIONS`, `STYLE_PRESETS` (7) |
| 220–245 | Draft eligibility | `slotAccepts`, `buildPool` |
| 303–598 | Tactics engine | `playerContribution` → `computeTeamProfile` → `identitySynergy`; `computeFamiliarity` |
| 600–637 | Readout | `tacticalReadout` (text only) |
| 639–773 | Season sim | `poissonSample`, `simulateMatch`, `roundRobinSchedule`, `estimateClubPoints`, `simulateSeason` |
| 776–801 | League evolution | `drawPromotedClubs`, `applyPromotionRelegation` |
| 804–1087 | State | `initialState`, squad helpers (`autoFillBench`, `generateShortlist`, `signToSlot/Bench`), `reducer` with 17 action types |
| 1089–2065 | 22 components | atoms (StatPip, OvBadge, Slider, RadarChart) → widgets (WheelSpinner, Pitch, PitchMarkings, BenchStrip, RoleEditor, StyleSelector, InstructionsPanel, TacticsSummary, EraRangeSlider) → screens (FormationSelect, Draft, Result, Transfer, RatingsReveal) |
| 2067–2316 | Root | `FMWeb`: one `useReducer`, drag coordinator, 60-line inline `<style>`, header, phase switch |

**State management.** A single `useReducer` at 2068 owns the game (`phase`, `assignments`,
`bench`, `draftedIds`, `instructions`, `simulation`, `season`, `shortlist`, `opponents`, …).
The phase machine is `formation → draft → tactics → reveal → result → transfer →
tactics(season+1)…` for six seasons. Two `useState`s in the root hold UI-only state
(`activeSlotId`, `dragInfo`), and five components keep private animation/interaction state
(wheel ticks, result reveal counter, ratings reveal counter, transfer "picking" toggle,
era-slider drag). Derived values (`liveAssignments`, `familiarity`, `profile`, `eraIndex`) are
`useMemo`'d in the root (2125–2134) and passed down as props; there is no context.

**Engine vs. rendering.** By convention the split is clean: lines 3–809 are plain functions
with no React in them. But the boundary isn't enforced in three ways: (a) the reducer calls
`Math.random` inside `SIMULATE` (1040–1053) and `GOTO_TRANSFER` (1055–1060); (b) the wheel
result is drawn in the root component (`onDoneSpin`, 2251) and dispatched as a `LAND` payload;
(c) every engine function reads the module-global `DATASET` directly (`getSquad` 22,
`generateShortlist` 866, `initialState` 827, plus two components at 1715 and 2131) rather than
receiving it.

**Dataset.** `DATASET` = `{ clubs, squads, index, opponents }`: 51 clubs (keyed by what look
like Transfermarkt ids), 666 club-seasons (1992–2024) holding 14,493 player rows as positional
arrays `[name, slot, side, age, nat, ov, pace, shooting, passing, dribbling, defending,
physical]`, a 666-entry `index` for the wheel, and 19 opponent profiles `{name, ov,
lastSeason, histMean, histStd, weight, vol}`. Rows are turned into player objects lazily by
`getSquad` on every call (22–26); the player id is synthesised at line 15 as
`season__name__ov__slot`. There are **zero** id collisions within a squad, so the scheme is
safe within a season (the cross-season duplicate is the known bug #4).

**`standalone/index.html`.** 157 lines / 1.25 MB, an esbuild-style IIFE bundle with its own
copy of React. It embeds **React 19.2.8** (7 version markers) while `package.json` pins
`^18.3.1`, so it was produced by a different toolchain from anything in this repo — nothing
here can regenerate it. On content it does **not** appear to have drifted: the dataset is
embedded (as an unquoted-key literal), all eight engine constants probed match
(`executionMultiplier` 0.70→1.08, xG `1.05 + gap/20`, ±33 gap clamp, `0.82/0.18` pedigree
blend, `mentalityShift`, `1.63` points slope, familiarity floor/ceiling 12/96, home advantage
3), and every UI string checked is present once `—`/`–` escaping is accounted for.
**Speculation:** it is the claude.ai artifact bundler's output, checked in by hand.

## 2. Design assessment

The engine half is genuinely well done: pure, heavily commented with *why* not *what*, and
every formula is traceable. The problems are structural, and they're specific:

**a. Impure reducer.** Randomness inside `SIMULATE`/`GOTO_TRANSFER` means the reducer can't be
replayed, snapshot-tested, or given a seed. It also means that under `<React.StrictMode>`
(`src/main.jsx:7`) dev runs *two full seasons* per click and keeps the second — harmless, but
dev ≠ prod. The four biased shuffles `sort(() => Math.random() - 0.5)` (730, 785, 870, 878)
are the known cousin of this.

**b. The rules of the game live in the UI path that happened to need them, not in the state
layer.** Position eligibility exists only in `buildPool` (225–245, draft). `SWAP_PLAYERS`
(997–1039), `signToSlot` (884–901) and `computeFamiliarity` (543–589, side-only check at 552)
know nothing about slot types. Bench size is capped in two copy-pasted `weakestIdx` loops
(895–899, 906–909). Player uniqueness is a `Set` of synthetic ids. None of these invariants
can be asserted in one place today.

**c. `role` has two shapes.** State stores the role *key* (string); `liveAssignments`
(1125–1127), `SIMULATE` (1041–1044) and `RoleEditor` (1401) each re-hydrate it into the object
independently. The root passes `{ ...activeAssignment, role: activeAssignment.role }` (a
no-op spread) to `RoleEditor`.

**d. Non-serialisable and shared state.** `draftedIds` is a `Set` (817), which blocks
saves/DevTools and needs the `new Set(...)` copy dance at every writer. `initialState`'s
`Set`/arrays are shared by reference across `SET_FORMATION`/`RESET` (916, 1080) — safe today
only because every writer copies first.

**e. A property bolted onto an array.** `pool.relaxed = relaxed` (244) is lost by any
spread/copy and is never read — which is exactly why the known bug #3 exists.

**f. Global data dependency.** Because engine functions read `DATASET` directly, a test can't
hand them an 8-club fixture without module mocking.

**g. Styling in three registers.** Tailwind classes, inline `style={{ display: "flex", … }}`
layout on most containers, and a 60-line `<style>` block rendered *inside* the component tree
(2140–2200). The CTA colour `#059669` is hard-coded at 11 call sites. No dynamic Tailwind
class construction — nothing will get purged.

**h. Accessibility is absent, not weak.** Zero `aria-*` attributes and zero `<label>` elements
in the whole file. Ten `<input type="range">` (e.g. 1171, 1506) and the role `<select>`
(1423) are unlabeled; `user-scalable=no` in `index.html:5`; positioning is drag-only.

**i. Hygiene.** Duplicate `eraIndex` memo (1715, 2131); dead `neutralRole` (1403); two
`eslint-disable-next-line` hiding stale-closure deps (1211, 1817); no ESLint config; `dm`
(duty multipliers, 313) vs `DM` (slot type) is an easy misread.

**j. Prop drilling.** Screens take 12–15 props (`DraftScreen` 1714). Fine at this size, but
every new feature lands in the root.

**Maintainability verdict:** the file's size is a data problem, not a logic problem — the
~1,400 lines of actual code would be a perfectly reasonable 8–10 files. What actually makes
it fragile is (a)+(b): you can't test what the reducer does, and the reducer doesn't
guarantee much anyway.

## 3. Bugs and correctness issues

### New findings

**B1. The user always loses ties.** Verified (sim). The user's row is `push`ed last (748) and
the table is stable-sorted on points only (749). Given the same points as the best rival, the
user finished 2nd in **2,000 of 2,000** runs. There is no goal-difference tiebreak either.
*Scenario:* you finish on 85 pts, Arsenal on 85 → `position === 2` → tier "Champions League"
(760) instead of "Champions", and the relegation logic at 795 sees the same bias at the bottom.

**B2. Club identity is an exact name string, and the two lists spell one club differently.**
Verified (sim). `DATASET.opponents` has `"Burnley FC"` (line 7); `CHAMPIONSHIP_POOL` has
`"Burnley"` (776). `drawPromotedClubs` excludes by exact name (784), so "Burnley" can be
promoted while "Burnley FC" is still up. In 12,000 simulated seasons, **611 tables contained
Burnley twice**. (`"West Ham United"` and `"Wolverhampton Wanderers"` appear in both lists with
*different* ratings — 73.4/72.0 vs 71.2/69.8 — so they come back changed; not a crash, but
inconsistent.)

**B3. Relegated clubs leave the universe.** Verified (reading). The pool is a fixed 24 (776)
and `applyPromotionRelegation` (793–801) never adds relegated clubs to it. 16 of the 19
starting rivals (Arsenal, Man City, Chelsea, Liverpool, Spurs, Man Utd, Villa, Brighton,
Newcastle, Palace, Forest, Leeds, Brentford, Bournemouth, Everton, Sunderland) have no pool
entry — once down, gone for the rest of the career. This compounds known bug #1: in the sim,
**3,659 of 12,000 transitions** re-promoted a club relegated the same summer.

**B4. Relegation is effectively deterministic.** Verified (sim). `estimateClubPoints`
(723–727) gives Sunderland AFC (ov 56.7, weight 0.973) an expected **22 pts ± 7.5**; the five
weakest pool clubs (Wrexham, Preston, Lincoln, Bristol City, Millwall) clamp to the **17-pt
floor**. Season-1 relegation over 4,000 runs: Sunderland **100%**, Bournemouth 70%, Burnley
61%, Wolves 54%, everyone else ≤ 8%. **86% of promoted clubs go straight back down.** The
`vol` noise (±3–8 pts) can't bridge the 20–30 point gap between the tiers, so the comment's
"league genuinely evolves under you" (789–792) is really a rotation of the same six clubs.

Expected points (no noise) by club, for reference:

| Club | Source | ov | weight | exp. pts |
|---|---|---|---|---|
| Arsenal FC | PL | 87.2 | 1.171 | 85 |
| Chelsea FC | PL | 84.8 | 1.220 | 84 |
| Manchester City | PL | 86.2 | 1.171 | 83 |
| Liverpool FC | PL | 84.0 | 1.162 | 78 |
| Tottenham Hotspur | PL | 83.2 | 1.162 | 77 |
| Manchester United | PL | 81.0 | 1.187 | 74 |
| Aston Villa | PL | 79.7 | 1.034 | 62 |
| Newcastle United | PL | 77.2 | 1.047 | 59 |
| Brighton and Hove Albion | PL | 78.0 | 0.958 | 55 |
| Burnley | pool | 73.8 | 1.074 | 54 |
| West Ham United | pool | 71.2 | 1.152 | 53 |
| Nottingham Forest | PL | 74.1 | 1.022 | 52 |
| Leeds United | PL | 73.3 | 1.053 | 52 |
| Everton FC | PL | 71.7 | 1.077 | 51 |
| Crystal Palace | PL | 76.2 | 0.919 | 50 |
| West Ham United | PL | 73.4 | 1.001 | 50 |
| Wolverhampton Wanderers | pool | 69.8 | 1.123 | 50 |
| Brentford FC | PL | 73.1 | 0.970 | 48 |
| Sheffield United | pool | 69.1 | 1.109 | 48 |
| Wolverhampton Wanderers | PL | 72.0 | 0.928 | 44 |
| Southampton | pool | 66.3 | 1.148 | 44 |
| Burnley FC | PL | 75.7 | 0.800 | 43 |
| AFC Bournemouth | PL | 72.8 | 0.876 | 43 |
| Watford | pool | 63.7 | 1.096 | 37 |
| Norwich City | pool | 63.1 | 1.102 | 37 |
| West Bromwich Albion | pool | 60.4 | 1.101 | 32 |
| Charlton Athletic | pool | 59.7 | 1.152 | 32 |
| Portsmouth | pool | 59.1 | 1.160 | 31 |
| Birmingham City | pool | 58.2 | 1.141 | 29 |
| Bolton Wanderers | pool | 58.0 | 1.152 | 29 |
| Stoke City | pool | 58.0 | 1.116 | 28 |
| Swansea City | pool | 58.0 | 1.113 | 28 |
| Queens Park Rangers | pool | 56.7 | 1.134 | 26 |
| Middlesbrough | pool | 56.0 | 1.162 | 25 |
| Derby County | pool | 55.2 | 1.180 | 24 |
| Sunderland AFC | PL | 56.7 | 0.973 | 22 |
| Blackburn Rovers | pool | 54.3 | 1.149 | 22 |
| Cardiff City | pool | 53.2 | 1.043 | 18 |
| Millwall / Bristol City / Lincoln City / Preston North End / Wrexham | pool | 46.5–52.0 | 0.78–0.85 | 17 (floor) |

Sum of the 19 starting rivals' expected points: **1,112** before adding yours (a real 20-team
league totals ~1,040–1,070 including the 20th team).

**B5. Touch drop fires twice.** Verified (reading); not device-tested. Both `pointerup` and
`touchend` are bound (2115–2116). On a touch device both fire in the same task;
`setDragInfo(null)` (2113) doesn't run the effect cleanup until React re-renders, so the second
event sees the same closure and dispatches `SWAP_PLAYERS` again; React 18 batches both and the
swap undoes itself. `MOVE_PLAYER` is idempotent, so the symptom is "dragging to open space
works, dropping on a teammate doesn't". The prior review marked this plausible; it now looks
near-certain.

**B6. Out-of-position play has no cost anywhere.** Verified (reading). On the tactics board
you can swap your bench GK into the ST slot (1017–1039); in the window, a candidate whose
position has no slot in your formation (e.g. a DM in 4-3-3) is offered **every** slot
including GK (1937–1938). The engine's only positional penalty is the −2 side mismatch (552).
A striker in goal is just a weak defender.

**B7. When *you* finish 18th–20th, only two rivals go down.** Verified (reading). 795 filters
non-user rows with `position >= 18`; the counts stay consistent (2 down, 2 up) but the tier
text says the dogfight "went the wrong way" (765) and nothing happens to you. Undocumented
design choice rather than a crash.

**B8. Released players are never re-releasable.** Verified (reading). `signToBench`/`signToSlot`
overwrite the weakest bench entry (895–899, 906–909) but `draftedIds` only ever grows
(1062–1069), so a bumped player can never reappear in a shortlist. Minor, but it's the
invisible side of the known "silent release".

**B9. Ambiguous ordering in the profile maths.** Verified (reading), intent unknown. The
counter/press bonus at 410 reads `press` *before* the pressing instruction is applied at 421,
so it keys on player-derived press only. May be intended.

**B10. Cosmetic.** Header says "Premier League · 1992 – 2025" (2210); data and era slider end
at 2024-25.

### Known issues — status after checking

- #1 bounce-back: confirmed and quantified (B3).
- #3 relaxed pool: dataset has 47 squads without a DM, 145 without an AM, 3 without a CM,
  2 without a WIDE.
- #4 same real player: 2,758 name+season repeats confirmed.
- #2 rival points: 19 rivals' expected total is **1,112** before adding yours.
- Hidden ratings leak: still present — stat pips with numbers at 1418 (`RoleEditor`) and 1950
  (`TransferCandidate`) while `PlayerMiniCard` hides the OV at 1117.

## 4. Suggested changes

**Must fix (small, no game-design change)**

1. **Tiebreak** — sort on `pts`, then GD, then GF, then name, and construct the user row
   before sorting so ordering never depends on insertion. (B1)
2. **Club identity** — give both lists a shared key. `DATASET.clubs` already has ids; use
   them, or at minimum a `clubKey(name)` normaliser used by `drawPromotedClubs` and
   `applyPromotionRelegation`. Push relegated clubs *into* the pool with their current numbers
   so they can return, and exclude this summer's relegated names from the draw. (B2, B3,
   known #1)
3. **Drop handler** — pointer events only, plus a once-per-drop ref guard. (B5)
4. **Purity** — get `Math.random` out of the reducer. Cheapest route that fits the existing
   pattern: generate the random inputs in the dispatcher and pass them as payloads, exactly
   as `LAND` already does. Better route: the spec's `takeRng`. Either way this is the single
   change that unlocks testing everything else.
5. **Invariants in the reducer** — slot-type eligibility (or a real familiarity/contribution
   penalty for out-of-position), bench ≤ 6, identity uniqueness — enforced in
   `SWAP_PLAYERS`, `SIGN_*`, `PICK_PLAYER` rather than in whichever component happens to
   render the choice. (B6, B8)
6. **`buildPool` returns `{ players, relaxed }`** and the draft screen shows it. (known #3)

**Should do (structure)**

7. **Split the file — but the first cut should be three files, not thirty.**
   `data/players.json` + `data/championship.json`, `engine.js` (lines 9–809 moved verbatim),
   `App.jsx`. That is a near-zero-risk mechanical move, it makes the data a separate cacheable
   chunk, and it lets Vitest import the engine. The roadmap's 12-module engine and 20+
   component files are a fine *destination*, but landing them all in Plan 1A before golden
   tests exist is where a refactor of this size usually breaks. Independent read of the
   roadmap: the sequencing (tests + golden files first, seeded RNG, then split) is right; the
   granularity of Plan 1A is more churn than a 1,400-line codebase needs in one release.
8. **One shape for `role`** — keep the key in state, hydrate once in a selector. Make
   `draftedIds` an array.
9. **Tailwind only** — delete the inline layout styles, move the `<style>` block to
   `index.css`, one `Button` component for the 11 CTAs.
10. **ESLint (react-hooks) + Vitest + a CI `check` job** that gates `deploy`. Today
    `deploy.yml` builds and ships on every push to `main` with nothing in between.
11. **Accessibility basics** — `<label>`/`aria-label` on every range and the select, remove
    `user-scalable=no`, a keyboard path for positioning.

**Nice to have**

12. Points model: the honest fix is the roadmap's full 20-team simulation (Phase 2). A cheap
    interim: scale the 19 rivals to a fixed league total (≈ 1,050 − your pts) so the table
    adds up, and widen `vol` for low-`ov` clubs so B4's determinism softens.
13. `LICENSE` and a data-provenance note (the club ids look like Transfermarkt's; the repo is
    public).
14. Build the standalone from the repo (`vite-plugin-singlefile`, as the spec plans) and
    delete the committed one.

## 5. Performance and optimisation

**Measured** (`npm ci && vite build`, output hash `index-DtTfGwnL.js` — identical to the live
site per the prior review):

| Asset | Raw | Gzip |
|---|---|---|
| `index-DtTfGwnL.js` | 1,159,976 B | 317,568 B |
| `index-BD9_YXNq.css` | 25,655 B | 4,971 B |
| line 7 dataset alone | 940,749 B | 243,957 B |

So the data is **~77% of the gzipped payload**; React + app + Tailwind is ~74 KB gz. Vite
emits its >500 kB chunk warning.

- **Cache invalidation.** Everything is one chunk, so any one-line UI change makes every
  returning player re-download 940 KB of unchanged data. Splitting the data into its own
  asset fixes this outright.
- **Parse cost.** The dataset is a JS *object literal*, so the engine has to parse it as
  code, on the critical path, at module top level. V8's published guidance is that
  `JSON.parse` of a string is meaningfully faster than an equivalent literal at this size;
  Vite's `json.stringify: true` does exactly that for `.json` imports. **Speculation:**
  100–300 ms on a mid-range phone; not benchmarked.
- **Runtime hot spots: none.** `getSquad` re-materialises player objects on every call
  (22–26): one squad per spin, ≤ 11 for `autoFillBench`, 40 (~900 objects) per transfer
  window — all sub-millisecond. A season is 38 `simulateMatch` calls.
- **Re-renders.** All state lives in the root, so every slider tick (`SET_INSTRUCTION`)
  re-renders the whole tactics screen: `Pitch` (11 slot buttons), `PitchMarkings` (~30
  absolutely-positioned divs, takes no props, rebuilt every render), `RadarChart` SVG, and
  `InstructionsPanel`'s ten ranges. There is no `React.memo` anywhere. The `useMemo`s on
  `familiarity`/`profile` are correct. Fine on desktop; **speculation:** slider drags may jank
  on low-end phones. `React.memo(PitchMarkings)` alone is free and makes it render once.
- **Timers** in `WheelSpinner`, `ResultCard`, `RatingsRevealScreen` chain `setTimeout` with
  proper cleanup — correct, including under StrictMode's double-mount.
- **Standalone.** 1.25 MB served raw from `file://` (no gzip), ~8% bigger than the Vite
  bundle because it inlines its own React 19 and CSS. The cost isn't size, it's that it's a
  hand-committed artifact with no build path — every engine fix now needs a second,
  unreproducible rebuild.

---

One addition to the roadmap that isn't there: **club identity (B2/B3) belongs in Phase 1, not
Phase 2.** It's a data-keying fix, not a game-design change, and the bug #1 fix planned for
1A will otherwise be patching over a name-matching problem it doesn't address.
