# Research 2: Gap analysis — FM.web v1.1 against the design theory

| | |
|---|---|
| **Status** | Draft for owner review, 2026-09-25 |
| **Date** | 2026-09-25 |
| **Series** | 2 of 6 |
| **Baseline** | `main` @ `8b3fc57` (v1.1.0) |
| **Inputs** | [01 Design research](2026-09-25-01-design-research.md) (the D/L/S/O/R/P/E tests), [code review 2026-09-11](../../code-review-2026-09-11.md) |
| **Feeds into** | [04 UI redesign](2026-09-25-04-ui-redesign.md), [06 Viability extras](2026-09-25-06-commercial-viability-extras.md) |

Every finding names the file and, where useful, the function or line. Numbers
marked *measured* were produced by driving the real reducer over the real
dataset (`src/data/players.json`, 666 club-seasons, 14,493 player rows) with
a throwaway script; the script isn't committed because it duplicates
`scripts/sim.mjs`'s setup, but the measurements are reproducible from it.

Severity: **A** blocks a paid release, **B** hurts retention, **C** polish.

---

## 1. Summary

| # | Gap | Severity | Tests failed |
|---|---|---|---|
| G1 | A draft pick is usually a choice between 2 options, made blind | A | D1, R1, R2 |
| G2 | The pool is sorted best-first while ratings are hidden, so "tap the top card" is the dominant strategy | A | D1, L3 |
| G3 | The tactics screen exposes all 14 controls at once, with hover-only help | A (mobile) | O1–O3 |
| G4 | The "Balanced" preset is presented as a peer of the other six but is punished by the engine | B | D2, O2 |
| G5 | The season is a 38-tick animation with no decisions and a table the copy itself calls estimated | B | D2, L1 |
| G6 | Seasons 2–6 replay season 1: no ageing, no familiarity growth, no history | A | L1, L2 |
| G7 | No meta-loop across careers; `careerSeed` exists but is invisible | B | L2, P1, P3 |
| G8 | The result card says `#FMweb` but nothing can be shared | B | L4, P1 |
| G9 | Draft-time constraints (era spread, side mismatch) are invisible until tactics | B | R2, R3 |
| G10 | No skip or re-draw in the draft | B | R4 |
| G11 | Linear phase flow with no way back; squad not visible during transfers | B | O4, S2 |
| G12 | Accessibility basics still open (zoom lock, drag-only, hover tooltips, contrast) | A (App Store quality) | O2, S4 |
| G13 | Hidden-ratings rule is inconsistent: OV hidden, six stats shown | C | D3 |
| G14 | Visual identity is a generic dark Tailwind theme with Football Manager vocabulary | A (commercial) | L4, and see 03 |
| G15 | Session boundaries exist only by accident of phase changes | C | S1, S2 |

Things v1.1 already does well, which the redesign must keep: the ratings
reveal as a staged payoff (`RatingsRevealScreen.jsx`) satisfies D3/R5; the
live radar and readout on the tactics screen (`TacticsSummary.jsx`) satisfy
half of D2; the era slider (`EraRangeSlider.jsx`) is a good Rosewater-style
restriction; seeded randomness (`engine/rng.js`, `state/rngState.js`) makes
P1 nearly free; autosave-on-phase-change (`components/app/useAutosave.js`)
gives S1 for free at the phase level; the free-positioning pitch is a real
lever (`engine/tactics.js` `positionFactors`) that no competitor has in this
form.

---

## 2. Method

1. Read every module in `src/engine`, `src/state`, `src/components`, `src/App.jsx`, `src/index.css`, `index.html`.
2. Drive the reducer (`state/reducer.js` `createReducer`) through a six-season career with the real dataset to measure pool sizes and save sizes.
3. Apply the design tests from 01 §9 to each screen.

---

## 3. Agency and the draft (D1–D4, R1–R5)

### G1 — A pick is usually a choice between two (severity A)

*Measured* pool size across all 666 club-seasons per slot type, before any
player has been drafted (`engine/players.js` `buildPool`):

| Slot | Median options | ≤ 2 options | ≤ 1 option |
|---|---|---|---|
| GK | 2 | 100% | 0% |
| CB | 4 | 0.3% | 0.2% |
| FB | 4 | 3.5% | 0.6% |
| DM | 2 | 92.9% | 20.3% |
| CM | 3 | 9.2% | 1.8% |
| AM | 2 | 78.2% | 30.8% |
| WIDE | 4 | 18.3% | 4.1% |
| ST | 3 | 2.7% | 0.3% |

The dataset was trimmed to roughly 22 players per club-season at build time
(14,493 rows / 666 squads), so pools are small by construction. A 4-2-3-1
draft (two DM, three AM slots) offers two or fewer options on five of
eleven picks, and one option about a quarter of the time on the AM slots.
FUT Draft offers five; Slay the Spire three-plus-skip (01 §6). Fails D1 and
R1.

### G2 — Best-first ordering leaks the hidden ratings (severity A)

`buildPool` sorts by side match then `b.ov - a.ov`. `DraftScreen.jsx`
renders the pool in that order with `hideRating`. The top card is therefore
always the best player, and the player can learn this within a couple of
picks. The Playwright helper `tests/e2e/helpers.js` `draftFullXI` exploits
exactly this ("firstCard.click()"). Combined with G1 the draft collapses to
"tap the first card", which is Meier's definition of an uninteresting
decision. The code review's balance table (§3) shows best-pick drafting
raises title odds from 39–57% to 88–89% with the dominant style, so the
leak also flattens the difficulty curve.

### G9 — Draft constraints are invisible during the draft (severity B)

`engine/familiarity.js` `computeFamiliarity` charges up to −16 for era
spread (`spread / 4.5`), −2 per side mismatch, −3 for mixed centre-back
duties. None of this is shown on `DraftScreen.jsx`; the player only sees
"Familiarity 61 · Solid" after the draft on `TacticsSummary.jsx`. The one
constraint a player *can* see is the era range in the small "Drafting Era"
panel. Fails R2 and R3: there is no tension on the pick screen and no
forming identity.

### G10 — No skip (severity B)

`state/reducer.js` `LAND` and `PICK_PLAYER` offer no way to decline a
pool. If a club-season yields one AM, the player must take him. Fails R4.

### G13 — Hidden-ratings rule is inconsistent (severity C)

Overall rating is hidden until `SIMULATE` (`PlayerMiniCard` `hideRating`,
the "?" badge in `RoleEditor.jsx` and `TransferCandidate.jsx`), but the six
component stats are shown numerically by `StatPip.jsx` on both of those
screens, and `RoleEditor.jsx` also prints effective attack/defence numbers
derived from them. Anyone who reads the pips knows the OV. The code review
noted this (§3, "Hidden ratings leak"). The redesign has to pick one rule
(04 §5.3) and the Phase 2 roadmap item "Consistent hidden-ratings rules"
becomes part of it.

### What passes

- D3/R5: `RatingsRevealScreen.jsx` staggers the reveal at 240 ms per player and ends on a squad average. This is the game's best moment and 04 keeps it as the run's payoff.
- D4: no timers anywhere; `WheelSpinner.jsx`'s 14-tick flicker is cosmetic.

---

## 4. Loops and progression (L1–L4, P1–P3)

### G6 — Seasons 2–6 replay season 1 (severity A)

- Players keep the `age` from their source row for the whole career (`engine/players.js` `rowToPlayer`; nothing in `reducer.js` `CONTINUE_SEASON` touches it).
- `computeFamiliarity` is a pure function of the squad and instructions, so it is identical in every season unless the player changes something; the UI copy ("systems take time to click") promises growth the engine doesn't have.
- `CONTINUE_SEASON` sets `simulation: null`; no `seasonHistory` field exists in `state/initialState.js`, so the previous table, match log and tier are gone the moment the next season starts.
- The transfer window is five random players (`engine/squad.js` `generateShortlist`, `count = 5`) with no cost and no scarcity.

Nothing is carried forward except the squad and a season counter. Fails L1
at the season level. The code review lists this as bug #5 and the roadmap
schedules it for Phase 2, but for a paid product it is a release blocker:
the second season is where a buyer decides whether the purchase was worth
it.

### G7 — No meta-loop (severity B)

`NEW_GAME` (`reducer.js`) replaces the whole state. There is no career
record, trophy cabinet, unlock, or "best finish" anywhere in state or
storage. `careerSeed` is set at `NEW_GAME` and never shown, so P1 ("play
the same run") is one text field away from working and doesn't. Fails L2,
P1, P3.

### G5 — The season is a cutscene (severity B)

`ResultCard.jsx` plays the 38 results at 25–55 ms per tick and shows one
line per match. There are no decisions between kick-off and the final
table (Phase 3 territory), and the table's other 19 rows come from
`engine/season.js` `estimateClubPoints`, which the on-screen copy
concedes: "Rivals' points are estimated from squad strength; yours are your
actual simulated results." A player who finishes 2nd on 88 points cannot
find out which fixtures lost the title. Fails D2 (attribution) and weakens
L1.

### G8 — Nothing to share (severity B)

The finished verdict card in `ResultCard.jsx` prints `#FMweb`, but there
is no share button, no image export and no seed code. The save menu's
`navigator.canShare` path in `state/exportImport.js` exists only for
`.json` saves. Fails L4/P1.

### What passes

- L3 is measurable: `scripts/sim.mjs` exists. It currently reports that Low Block Counter wins 88% of best-pick seasons and Park The Bus 4% (code review §3), so the test fails on result, not on tooling.

---

## 5. Sessions and pacing (S1–S4)

- S1/S2 partly pass: `useAutosave` writes on every phase change and 500 ms after other changes; `ResumeCard.jsx` shows "Season 3 · 2028-29 · Tactics". But the resume card shows the *phase*, not the *next action* (S2 wants "Pick your third midfielder" or "Set your tactic and kick off").
- **G15**: the only stopping points are phase boundaries. A draft is 11 picks with no "half-time"; a season is a single button. On a phone, the draft (11 × spin + read + pick) runs 3–5 minutes, which is at the edge of S3. The redesign adds explicit stop points (04 §6).
- S4 fails on tactics: the most repeated interaction there is dragging a marker (`components/pitch/usePitchDrag.js`) or moving an `<input type="range">` (`components/ui/Slider.jsx`); neither is one-tap.

---

## 6. Onboarding and information architecture (O1–O4)

### G3 — Everything at once, help on hover only (severity A on mobile)

`components/screens/InstructionsPanel.jsx` renders 11 sliders and three
toggles in one panel; `TacticsScreen.jsx` places it beside a 7-card
`StyleSelector`, the pitch, the bench, and `TacticsSummary` (radar +
familiarity bar + up to five paragraphs). `Slider.jsx` shows its `tooltip`
via `group-hover:block`, which never triggers on touch. `FormationSelect.jsx`
explains the draft in a 70-word paragraph. Fails O1–O3.

### G4 — "Balanced" is a trap (severity B)

`engine/instructions.js` describes Balanced as "No imposed philosophy…
build a bespoke system from first principles", and `StyleSelector.jsx`
shows it as one of seven equal cards. `engine/tactics.js` `identitySynergy`
then applies −5 attack, −5 defence, −3 creativity to any setup whose dials
sit within 0.16 of neutral. The readout (`engine/readout.js`) does say "No
real identity here", but only after the choice, in the third panel. Fails
D2 and O2: a labelled option whose consequence is hidden.

### G11 — Linear flow, no way back (severity B)

`App.jsx` switches on `state.phase`; the header stepper (`formation →
draft → tactics → result`) is display-only and hidden below the `sm`
breakpoint. There is no way to view the squad or pitch from
`TransferScreen.jsx` (it lists replacement targets by surname only), no way
to revisit the last season's table from tactics, and no settings screen
(`SaveMenu.jsx` holds two actions and a version string). Fails O4 and S2.

---

## 7. Accessibility and platform (part of O2, S4; roadmap Phase 1B)

### G12 — Open items (severity A for App Store quality)

Still true in v1.1 despite the Phase 1 spec §5.3:

- `index.html` viewport still has `maximum-scale=1, user-scalable=no`.
- Player positioning is drag-only (`usePitchDrag.js`); no keyboard or tap-to-move path.
- `Slider.jsx` help is hover-only; `EraRangeSlider.jsx` handles are `<button>`s with no `aria-label`, `role="slider"` or keyboard handling.
- `StyleSelector.jsx` selected state uses `text-neutral-900` on `bg-emerald-600` for the description (fails AA, code review §4).
- No `prefers-reduced-motion` handling for the wheel flicker, the reveal stagger, or the 38-tick result.
- No `aria-live` region for moves/swaps; pitch markers have no accessible name beyond the slot type.
- Inline `style={{ display: "flex" ... }}` layout throughout `FormationSelect.jsx`, `DraftScreen.jsx`, `TacticsScreen.jsx`, `RoleEditor.jsx`, `TransferScreen.jsx`.

These were all scheduled for Phase 1B and are now requirements of the
redesign (04 §8) rather than a separate polish pass.

---

## 8. Identity and vocabulary (L4, and 03)

### G14 — Generic theme plus borrowed vocabulary (severity A, commercial)

Visual: `App.jsx` sets Inter, a dark green-black gradient, emerald CTAs
(`#059669`) and an amber accent (`#c9a227`); every panel is
`.fmweb-panel`. Nothing in the palette, type or motion is specific to this
game's idea (drafting across 33 years of one league). Written: the
`<title>` is "FM.WEB — Football Manager, in your browser", the header
tagline repeats it, `package.json` and `README.md` repeat it, and the
tactics vocabulary is Football Manager's (roles, duties, mentality ladder,
"Tactical Familiarity", structured/fluid shape, "Gegenpress" preset). 03
§3 has the full list and the differentiation plan. Rosewater's test (L4)
asks what players would *love* about this game specifically; today the
answer is the era-draft idea, and the UI doesn't show it.

---

## 9. What the code does not need

To keep the redesign scoped, these were checked and are fine:

- `engine/*` is pure and tested (golden files in `tests/golden`); the redesign does not touch it except to add fields the UI needs (season history, seed display), all of which are state-level.
- `state/save.js` validation and migrations exist; a `saveVersion` bump with a migration covers the new state fields.
- Bundle: data chunk 0.93 MB, app code small; no performance work is needed for the redesign itself.
- `scripts/sim.mjs` is the right tool for L3; it only needs thresholds and CI wiring (06 §7).

---

## 10. Owner questions raised here

Answered with a proposed default in the spec that owns them:

- Whether Phase 2's progression work (G6) moves ahead of the App Store release → 06 §7 and the plan; default **yes, a subset does**.
- Which hidden-ratings rule to adopt (G13) → 04 §5.3; default **hide OV, show stats as five-band pips without numbers**.
- Whether to change the dataset trim so pools are bigger (G1) → 04 §5.2 and 06 §7; default **no dataset change; offer three club-seasons per pick instead**.
