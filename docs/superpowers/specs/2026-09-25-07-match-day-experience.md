# Spec 7: Match-day experience — the season, one fixture at a time

| | |
|---|---|
| **Status** | Approved 2026-09-26 with the §14 defaults; built as milestone F, v2.7.0. Settling tuned to −3/−2/−1/0 (no +3 bonus) under the `sim.mjs` check, see the 2.7.0 changelog |
| **Date** | 2026-09-25 |
| **Series** | 7 of the redesign series (01–06 plus the plan) |
| **Baseline** | v2.0.0 (`468dbdf`), with milestone C (career depth, part 1) in progress concurrently |
| **Inputs** | [01](2026-09-25-01-design-research.md) design tests D/L/S/O; [02](2026-09-25-02-gap-analysis.md) G5, G6, G15; [04](2026-09-25-04-ui-redesign.md) §5.5, §5.6, §5.7, §9, §10; [06](2026-09-25-06-commercial-viability-extras.md) §1; [roadmap Phase 3](../../roadmap.md#phase-3-match-day-experience-v50) |
| **Plan** | **Milestone F** in [2026-09-25-redesign-and-app-store.md](../plans/2026-09-25-redesign-and-app-store.md), approved 2026-09-26 with the §14 defaults |

This spec details the first slice of what the roadmap calls Phase 3
("Match-Day Experience"), which until now said only "waiting on Phase 2".
It replaces the whole-season-in-one-batch loop with a fixture-by-fixture
loop: set the team up, play one match, read a report with scorers, repeat;
and it gives the record a match-by-match memory. It does **not** cover the
rest of Phase 3 (a live 2D or commentary view, in-match substitutions,
injuries and fitness), which stays where the roadmap has it.

Vocabulary follows spec 04 Appendix A: job, brief, identity, cohesion,
mentality labels Contain…All-out. The product is Era XI.

---

## 1. Goals

1. Make the season a game, not a cutscene (02 G5): a decision before every fixture, a consequence after it.
2. A proper match report: who scored and roughly when, for every match, kept for the whole career.
3. Keep the season interruptible at every match (01 S1–S3) without making a season slower to *finish* than it is today for a player who doesn't want to step through it.
4. Change the engine as little as possible: the same `simulateMatch`, the same profile, the same balance; events are narrated *from* the scoreline, not a new simulation model.
5. Land cleanly on top of milestone C (real league, ageing, cohesion memory, window budget) rather than beside it.

## 2. Non-goals

- In-match control (half-time changes, substitutions, shouts), a minute-by-minute live view, injuries, fitness, morale, player match ratings. Roadmap Phase 3 remainder.
- Opponent styles or adaptive AI ("matchups"). Roadmap Phase 2. §3.2 is honest about what that leaves.
- A mid-season transfer window (§14 M6).
- Changing the free/paid boundary (05 §4). It stays at "Open the window" after season one.
- Any change to the draft, the board's controls, or the chalkboard.

---

## 3. Design reasoning

### 3.1 What the season is today

`SIMULATE` (reducer) runs all 38 fixtures in one call to `simulateSeason`
and stores the finished season in `state.simulation` before the player has
seen the reveal. The Vidiprinter then types a decided result in at 350 ms a
line. Between kick-off and the back page there is nothing to decide, and
the Board tab, although still fully editable in the `result` phase (no
reducer guard stops `SET_INSTRUCTION` or `SWAP_PLAYERS`), does nothing
until the next `SIMULATE`. "Tactics locked until the window" is a fact
about *when the engine reads the board*, not about the controls. That is
the whole change here: read the board before every fixture instead of once
a season.

Against the 01 design tests: D2 fails (a player who finishes second cannot
find out which fixtures cost the title, and cannot attribute any result to
a choice), L1 is weak at the season level (the season returns one row), S1
passes only at phase boundaries (G15).

### 3.2 What a per-match decision actually adds, in this engine

Be precise about it, because AI opponents do not adapt (no opponent
styles until Phase 2) and the opponent model is one number per club
(`ov` blended with `histMean`) plus home advantage. So what is there to
decide each week?

**The lean is a variance decision, not a points decision.** Mentality moves
attack up and defence down by the same amount (`tactics.js`, ±15 at the
extremes), which in `simulateMatch` is roughly ±0.75 xG on each side. Under
the Poisson model that changes *how often you draw* far more than how many
points you expect:

| Opponent | Lean | xG for / against | W | D | L | Expected pts |
|---|---|---|---|---|---|---|
| 12 weaker | Contain | 0.90 / 0.25 | .51 | .39 | .10 | 1.92 |
| 12 weaker | Even | 1.65 / 0.45 | .67 | .23 | .10 | 2.25 |
| 12 weaker | All-out | 2.40 / 1.20 | .64 | .18 | .18 | 2.10 |
| Level | Contain | 0.30 / 0.30 | .20 | .60 | .20 | 1.20 |
| Level | Even | 1.05 / 1.05 | .35 | .30 | .35 | 1.35 |
| Level | All-out | 1.80 / 1.80 | .39 | .22 | .39 | 1.39 |
| 12 stronger | Contain | 0.25 / 0.90 | .10 | .39 | .51 | 0.69 |
| 12 stronger | Even | 0.45 / 1.65 | .10 | .23 | .67 | 0.52 |
| 12 stronger | All-out | 1.20 / 2.40 | .18 | .18 | .64 | 0.71 |

(Computed from `simulateMatch`'s xG formula and clamps with a ±15
mentality shift; the real numbers also move creativity and cohesion
slightly. The point survives the approximation.)

Expected points barely move (0.1–0.3 a match). The draw probability moves
from 18% to 60%. That is a real decision *only when the situation makes
variance matter*: a point is enough with three to play; a point is useless
when you need a win to go top; away to the leaders, keeping it tight is a
sensible bet. It fails Meier's test if there is no situation, and today
there isn't one, because there is no live table. It passes it once the
table updates every week, which is what this spec adds. So the per-match
lean is meaningfully different from today **because of the live table, not
because of the opponent**. Without opponent styles the "which opponent"
part of the decision is thin (stronger or weaker, home or away) and this
spec should say so rather than sell it as matchup play.

**Without a cost to changing, weekly changes are free re-optimisation.**
`computeFamiliarity` is a pure function of the board, so today a change
costs nothing and a player could flip Contain/All-out every week by
opponent strength. Then the "decision" is a lookup and the interesting
trade-off is gone. Milestone C3 adds a season-level memory (+2 per season
in a system, −4 on change). This spec adds its within-season counterpart,
**settling** (§4.3): a system you keep for several matches gains a few
cohesion points; one you just changed loses a few for the next couple of
fixtures. Then "adapt for this fixture" versus "stay settled" is a real
trade-off with a persistent consequence (Meier's third and fourth
criteria), and the report can show which one you took.

**Personnel changes add little until there is a reason to rotate.** The
bench is built by `autoFillBench` from the best remaining players of the
drafted club-seasons, so bench players are weaker than starters by
construction, and there is no fitness, injury or form. Swapping a bench
player in is a downgrade with no upside. The swap mechanics already exist
(`SWAP_PLAYERS` from the player sheet's "Swap with…" and from dragging a
bench marker onto the board) and they will simply *apply* to the next
match, but the spec does not pretend that is a new decision. The one cheap
consequence that gives the bench a job is suspensions: cards in the
report, a one-match ban for a red or a fifth yellow, and a starter who
must be replaced before the next fixture. §5.4 scopes it as a separable
task (M3) so the owner can cut it; the recommendation is to keep it,
because it is the difference between "you can swap" and "you sometimes
have to".

**The report is attribution, not diagnosis.** The engine has no per-player
form, so a scorer list cannot tell the player "X is out of form". What it
can do is make the chain of consequences visible (01, Balatro): scorers are
drawn in proportion to each starter's attacking contribution, which is
exactly what job, brief, position and the personal dials set. A Poacher on
Push standing at the top of the box *will* lead the scoring; a Link
forward dropped deep will not. That is a consequence the player set up and
can read back (D2), and it is the honest limit of what the report means.

### 3.3 What it costs

**Time.** Today a season is about a minute of watching (reveal 2.6 s,
vidiprinter 13 s, two slips). Stepping through 38 fixtures at 15–45 s each
is 10–30 minutes a season and one to three hours a career. That is the
intended shape (there was no play in the season before) but it is also
the risk: a player who wants the old pace must still have it. So
**fast-forward is not optional** (§7.4): "Play to…" the half, the end, or
the next defeat, with the results typing in on the existing vidiprinter.
Acceptance criterion: a season played with "Play to the end" from
pre-season takes no longer than today's vidiprinter.

**Taps.** The minimum is one tap per match on the sticky bar (S4). The
Board and Squad tabs stay where they are; nothing new has to be visited to
play a match.

**Save churn.** Every match is a stopping point, so every match autosaves
(the existing 500 ms debounce covers it). Save size grows by about 6 KB a
season for the match log (§9.5), well inside the 512 KB iCloud guard.

### 3.4 Design tests applied

| Test | How this spec meets it |
|---|---|
| D1 two live options | Before each fixture: keep the system (settled bonus) or lean/change it (variance, settling cost). Both are reasonable in different table situations. |
| D2 predict, then attribute | The next-fixture card shows the opponent's strength as the tick on the Strengths bars; the report shows the scoreline, scorers and the identity/cohesion you played with; the record keeps it. |
| D4 no forced pacing | No timers; Play is a tap; fast-forward is opt-in. |
| L1 each loop returns something | Every match returns a report entry the career keeps. |
| S1–S3 stopping points | Every match; autosave after each; a match step is under half a minute; a resume shows "Play week 12: Arsenal (A)". |
| S4 one thumb | Play is the sticky bar; K on desktop. |
| O4 what now | The Next pill names the fixture. |

---

## 4. "Change your team around": what it means here

### 4.1 Tactics (in scope, no new controls)

Everything on the Board tab: style preset, the three approach dials, the
eight in/out-of-possession dials and three switches, and per-player job,
brief, attacking freedom and defensive discipline on the player sheet, and
marker positions on the chalkboard. All of it is read at `PLAY_MATCH`
(§9.2). No control changes; the tab simply matters every week.

### 4.2 Personnel (in scope, already supported)

Bench ↔ XI swaps via `SWAP_PLAYERS` (player sheet "Swap with…", bench
marker drag on the board, keyboard swap). The squad model is eleven
assignments plus a bench of up to six `{ player, role: null, duty: null }`
entries; a swapped-in player takes the slot's default job and brief with
sliders reset to 50, as today. Formation changes mid-season are **not**
offered: `SET_FORMATION` resets the squad and there is no formation switch
after the draft in v2.0 either. Not a regression, and not something this
spec adds.

### 4.3 Settling (new, small)

A **system signature** is `formationKey` + the seven identity dials
(`mentality, tempo, directness, width, press, line, tackling`, each
rounded to the nearest 5) + `shape`. Personnel swaps and the other four
dials don't change the signature (they have their own costs already:
era spread, side mismatch, reset sliders, extremity).

`cohesionMemory.matches` counts consecutive fixtures played with the same
signature. Before a fixture, if the signature differs from the last one
played, `matches` resets to 0. The modifier applied to cohesion for that
fixture:

| Matches in this system | Modifier |
|---|---|
| 0 (just changed) | −3 |
| 1 | −2 |
| 2 | −1 |
| 3–5 | 0 |
| 6+ | +3 |

Numbers are a starting point for C5-style tuning (§10.1). The modifier is
shown on the match-day screen ("Just changed: cohesion −3 this match" /
"Settled in: +3") so the cost is visible before committing (D2), and
recorded on the match entry so the record can show it.

This is the within-season half of milestone C3's `cohesionMemory`
(seasons in a system, +2 a season). Both go through the same optional
`memory` argument to `computeFamiliarity` (§10.1); the golden
`profiles.json` is unaffected because its inputs pass no memory.

### 4.4 Out of scope, and why

Substitutions during a match, formation switches mid-season, fitness and
rotation, injuries: each needs either an in-match model or an availability
model on assignments that the roadmap places later. Suspensions (§5.4) are
the one exception because they can be expressed with the existing swap
mechanics plus a small map in state.

---

## 5. The match: engine changes

Principle: `simulateMatch(profile, opp, isHome, familiarity, rng)` keeps
its signature and its `{ gf, ga }` return, so the balance sim
(`scripts/sim.mjs`), the golden files and milestone C's tuning are
unaffected. Everything new is either *around* it (per-fixture seeding) or
*after* it (narrating events from the score).

### 5.1 Per-fixture seeding

Today one rng stream runs through the whole season, so fixture 12's
result depends on how many random numbers fixtures 1–11 consumed (Poisson
sampling draws a variable count). For a stepped season the result of
fixture *k* must depend only on the season's seed, *k*, and the board as
it stands before *k*, never on what happened in between or how many
actions the player took. So:

```js
// engine/season.js
export function fixtureRng(seasonSeed, week)  { return createRng(deriveSeed(seasonSeed, week)); }
export function eventRng(seasonSeed, week)    { return createRng(deriveSeed(seasonSeed, 1000 + week)); }
export function roundRng(seasonSeed, week)    { return createRng(deriveSeed(seasonSeed, 2000 + week)); } // rivals (C1)

export function simulateFixture(profile, familiarity, opp, fixture, seasonSeed) {
  const res = simulateMatch(profile, opp, fixture.home, familiarity, fixtureRng(seasonSeed, fixture.week));
  const outcome = res.gf > res.ga ? "W" : res.gf === res.ga ? "D" : "L";
  return { week: fixture.week, opponent: fixture.name, home: fixture.home, gf: res.gf, ga: res.ga, outcome };
}

// The batch season, kept for sim.mjs and the golden test. Draws the order and
// the season seed from the caller's rng, then plays 38 fixtures the same way
// the reducer does one at a time.
export function simulateSeason(profile, familiarity, oppList, rng) {
  const order = rng.shuffle(oppList).map((o) => o.name);
  const seasonSeed = rng.int(2 ** 32);
  return playSeason(profile, familiarity, oppList, order, seasonSeed);
}
```

`playSeason` is the loop; `simulateSeason` is the batch wrapper. This
changes the recorded results in `tests/golden/seasons.json` (different
draws per fixture), so it is re-recorded in its own commit stating the
reason, after milestone C1 has done its own re-record (§10.1).

**Batch equivalence** is the property that keeps the roadmap's Phase 3
exit criterion ("results stay statistically in line") exact rather than
statistical: 38 `PLAY_MATCH` steps with an unchanged board produce the
same `matches`, `w/d/l/gf/ga/pts` as `playSeason` with the same inputs. A
unit test asserts it (§12).

### 5.2 Events: goals with scorers and minutes

`engine/match.js` gains one pure function that narrates a scoreline:

```js
// Attributes the goals of a decided scoreline. Own goals are the opponent's;
// the player's are drawn in proportion to each starter's attacking
// contribution (job × brief × position × freedom, the same number the
// profile is built from), so a Poacher on Push at the top of the box leads
// the scoring and a Blocker almost never does. Minutes are uniform over the
// ninety with a small chance of stoppage time, sorted, distinct.
export function matchEvents({ gf, ga }, starters, rng) → { goals: Goal[] }

Goal = { minute: 1..95, us: true, slotId, name }   // ours: who
     | { minute: 1..95, us: false }                 // theirs: when
```

Rules:
- Scorer weight for a starter = `max(0, playerContribution(a).att)`; goalkeepers are weighted 0 explicitly. If every weight is 0 (impossible with real data, possible in fixtures) fall back to uniform over outfield starters.
- Minutes: `1 + rng.int(90)`; with probability 0.08 a goal is in stoppage time (`90 + 1 + rng.int(5)`). Draw `gf + ga` minutes, de-duplicate by redrawing, sort ascending, then assign sides by shuffling a list of `gf` "us" and `ga` "them" markers. The report reads as a timeline.
- Deterministic from `eventRng(seasonSeed, week)`, which is a different stream from the scoreline's, so narration never alters a result and the batch season stays event-free (no cost in `sim.mjs`).

**Opposition scorers are not named** in this slice (M4). The opponent
model has no squad; naming them from the dataset's most recent real
squad on file would work for most clubs but not for promoted ones without
a top-flight season in the data (a handful in `championship.json`), and
an inconsistent report is worse than a plain one. "Arsenal 34'" is how a
vidiprinter reported it anyway.

**Assists are out** (M5). The six stats could support them (passing), but
a second attribution per goal doubles the noise for no decision the player
can make, and it is the one thing that would make the report a
spreadsheet.

### 5.3 What the report can and cannot mean

The events are a narration of the score, and the spec says so in the
coach's note for the season tab rather than implying a hidden per-player
simulation. What *is* meaningful: the shape of who scores over a season
is the shape of the attacking jobs the player set, and a season's top
scorer is a genuine consequence of the board.

### 5.4 Cards and one-match bans (M3, separable task F5)

If approved, `matchEvents` also returns `cards: [{ minute, us: true, slotId, name, kind: "yellow" | "red" }]`
(the opposition's cards are not tracked; they change nothing for the
player). Rates: a team's yellows per match ~ Poisson(1.6) scaled by
`0.6 + instructions.tackling / 125` (Cautious ≈ 1.0×, Aggressive ≈ 1.4×);
a red with probability 0.05 per match, same scaling. The player carrying
each card is drawn in proportion to `playerContribution(a).def + playerContribution(a).press`
(the players who tackle and press), goalkeepers included at their tiny
weight. This gives the Tackling dial the downside it currently lacks
(today it buys defence for nothing but a little extremity cost).

State gains `discipline: { [playerId]: { yellows, banned } }`. After a
match: a red sets `banned: 1` and zeroes yellows; the fifth yellow sets
`banned: 1` and resets to 0. Before a match, any starter with `banned > 0`
blocks `PLAY_MATCH`; `selectNextAction` becomes "Replace Adams
(suspended)" pointing at the Squad tab, the marker shows a chalk cross,
and the swap flow that already exists does the rest. After the match the
ban decrements. A banned player on the bench is fine. Bans clear at the
end of the season (keep it simple; no carry-over).

Why bans and not injuries: a ban is a known, one-match, deterministic
consequence that reuses the swap; an injury needs a duration model, a
fitness read-out and a return, which is Phase 3 proper.

---

## 6. The match report

One `MatchReport` component (§7.5), used three times: on the match-day
screen for the fixture just played; as an expandable row in "Season so
far" and the back page's match list; in the record's season sheet.

Content, in order, on newsprint:

1. **Kicker**: `Week 12 · Away` (or Home).
2. **Headline score** in Barlow Condensed: `Arsenal 1 — 2 Your XI` with the home side first, as printed. Tone colour on the result: `--win` / `--draw` / `--loss`.
3. **Scorers**, two columns in mono, ours on our side: `Shearer 23'  Adams 67'` / `34'`. Stoppage-time minutes print as `90+2'`. An empty column prints `—`.
4. **The line you played**: identity chip, cohesion label with the settling modifier in brackets ("Settled · +3"), mentality label ("Front-foot"), and "Changed this week" when the signature changed.
5. **Table line** (mono): `After week 12 · 4th · 24 pts` (the position bar's string, `season.position`).
6. With F5: a cards line ("Booked: Vieira 44'. Sent off: —") and, when it applies, "Adams misses the next match".

Nothing else. No possession, shots, ratings; the engine doesn't have them
and inventing them would break the "every number is derived" rule the
engine keeps.

---

## 7. The season loop and its screens

### 7.1 Information architecture

Season tab states (spec 04 §5.5, extended):

```
Pre-season → Team sheet (reveal) → Match day ⟲ (38 fixtures, with Play to… fast-forward) → Back page → Window → next Pre-season
```

Phase mapping: `tactics` → Pre-season; `reveal` → Team sheet; **`matchday`**
(new) → Match day; `result` → Back page (the vidiprinter no longer runs
here); `transfer` → Window. `modeFor(phase)` returns `club` for
`matchday`, so the tab bar is present and every tab is reachable all
season, which is the point.

**Pre-season stays** (M8). It is the once-a-season stop after the window
where the new opposition is listed and the tactic is reviewed with
cohesion memory carried over (C3), and it is where "Kick off" lives. It
gains one line: "The fixture list is drawn at kick-off." The reveal stays
where it is, once a season, as the run's payoff (01 D3/R5).

**The window stays between seasons** (M6). Milestone C4's budget is per
season; a mid-season window would need a second budget, a second
shortlist and a rule about who has played. The era-draft identity is one
XI per season with a window between; nothing here needs to change that.

### 7.2 Match day (new screen: `screens/Season/MatchDay.jsx`)

Phone, top to bottom:

1. **Position bar** (reused from the Vidiprinter): `Week 12 of 38 · 4th · 24 pts`, computed by `selectTable` at the current week (a real table, not the scaled estimate `runningPosition` uses today).
2. **Last report** (`MatchReport` in a `Slip`), when a match has been played this season. Absent at week 1.
3. **Next fixture** as a `Cutting` (static, no `onOpen`): kicker `Next · Week 12 · Away`, title the opponent's name, subtitle `3rd · 26 pts` from the live table plus `promoted` where it applies. Below it, the six **Strengths bars** with the reference tick set to *this opponent's* effective strength (`Strengths` takes a `reference={{ value, label }}` prop; the Board keeps the rivals' average) and the identity line with the settling note ("Settled in: 6 matches in this system, +3" / "Just changed: −3 this match"). Two ghost buttons: **Board**, **Squad** (tab shortcuts).
4. **Season so far** (`Disclosure`, collapsed): the results `Ticker` (existing `resultLine`, rows expandable to a `MatchReport`), then the league `Table` at this week (`selectTable`).
5. **Sticky bar**: **Play week 12** (primary; K on desktop). Beside it a ghost **Play to…** that opens a `Sheet` (§7.4).

Desktop (≥ 1024 px): last report and next fixture side by side, season so
far as the third column.

The **Next pill** and Home's resume card read `Play week 12: Arsenal (A)`
from `selectNextAction`; with a suspended starter (F5) they read
`Replace Adams (suspended)` and point at the Squad tab.

After `PLAY_MATCH` the screen re-renders with the new report at the top
(slip motion) and the next fixture below; the live region announces the
result line and the table line once (04 §8.5 allows announcements at
pauses, and a match is a pause).

### 7.3 Board and Squad during the season

Unchanged screens. The sticky bar on the Board and Squad tabs during
`matchday` is **Play week 12** as well, mirroring today's "Kick off" on
Board and Season in `tactics`, so a player who adjusts the dials can play
from where they are. The `revealed` flag (overalls visible) is true in
`matchday` as it is in `reveal` and `result`.

### 7.4 Fast-forward: Play to…

A `Sheet` with a `ChipRow`:

- **Next match** (default; same as Play)
- **The half** (week 19) or **the end** (week 38), whichever comes first
- **The next defeat** (stops after the first `L`, or at the half/end)
- **The end of the season**

Dispatches `PLAY_TO { until }` (§9.2), which plays the fixtures in one
reducer call with the board frozen as it stands, generating a report for
each. The UI then shows the newly played results typing in on the existing
**Vidiprinter** (350 ms a line, Pause, Skip, half-season slip when it
crosses week 19) and returns to Match day when the feed ends. Under
reduced motion or on resume the feed is instant. The state is already
final and autosaved when the animation starts, so a refresh mid-feed lands
on the completed state, as today.

"The end of the season" from week 1 therefore stops once at the half
(the 04 §5.5 stopping point) and once at the end. Two taps; a full season
in about as long as today's vidiprinter (§12).

### 7.5 Components

New, in `src/screens/Season/`: `MatchDay.jsx`, `MatchReport.jsx`
(newsprint slip body, compact variant for rows), `PlayToSheet.jsx`,
`FixtureCard.jsx` (the cutting plus bars). New selector-backed helpers in
`src/state/selectors.js`: `selectTable(state, week)`,
`selectNextFixture(state)`, `selectSettling(state)`,
`selectTopScorers(log)`. No new primitives: `Slip`, `Cutting`, `Ticker`,
`Table`, `Disclosure`, `Sheet`, `ChipRow`, `StrengthBars`, `Meter`,
`Stamp`, `TeamSheetRow`, `Callout`, `Term`, `LiveRegion` cover it. One
new term in `content/terms.json`: `settling`. One changed coach's note
(`season`): "One match at a time. The board is read before every fixture;
Play to… runs a batch on the vidiprinter."

Changed: `Vidiprinter.jsx` takes `lines` for a range of weeks and a real
table for the position bar (`runningPosition` goes); `BackPage.jsx` drops
the "estimated" footnote (C1) and its match rows expand to reports;
`Preseason.jsx` gains the kick-off line; `Strengths.jsx` gains the
`reference` prop; `SeasonTab.jsx` switches on the new phase; `App.jsx`
loses `feedDoneSeason` and the vidiprinter-in-`result` branch, and
`NEXT_ACTIONS` gains `playMatch`.

---

## 8. The season-end record

### 8.1 Back page

Unchanged headline, standfirst, record and table. The **Matches**
disclosure lists the 38 `resultLine`s as today, each expandable to its
`MatchReport`. One line is added under the record: **Top scorer:
Shearer, 22** (from `selectTopScorers`). The share slip gains the same
line. The footnote about estimated rivals' points goes with C1.

### 8.2 Club › Record

Today: one table row per completed season (season, finish, points,
identity, verdict) and three career stats. The row shape stays; each row
becomes tappable and opens a **season sheet** (`Sheet`, size `lg`):

- Kicker `Season 3 · 2028-29`, title the verdict, the record line.
- **Form**: 38 W/D/L letters in mono with the result tones, one line, wrapping on phones.
- **Top scorers**: up to three, `name · goals`.
- **The matches**: the results `Ticker`, rows expandable to `MatchReport`s.
- Seasons played before this feature (migrated saves) show "No match log for this season" in place of the last three.

Career summary gains two stats: **Top scorer** (career, across seasons by
player name and identity — `playerIdentity` from `engine/identity.js`
already de-duplicates the same real player across club-seasons) and
**Biggest win**. The career-complete slip prints the per-season top
scorers under each row.

This needs `seasonHistory[i].matches` (§9.4). Spec 04 §9 chose not to
keep the per-season simulation for size; the per-match log is the lean
part of it (about 6 KB a season) and it is what the record is for.

---

## 9. State, actions, save format

### 9.1 New state

```js
// initialState.js additions
campaign: null,        // the season in progress; null outside reveal/matchday
discipline: {},        // F5 only: { [playerId]: { yellows, banned } }

// cohesionMemory (milestone C3's field) gains `matches`; if C3 has not landed
// when this is built, this spec introduces the field with `matches` only and C3
// adds `seasons`.
cohesionMemory: { signature: null, seasons: 0, matches: 0 },

// campaign, created by START_SEASON
campaign: {
  seed,                // uint32 drawn at kick-off; every fixture, its events and every rival round derive from it
  order,               // string[19]: the rivals in draw order; the round-robin is rebuilt from it
  week,                // 1..38: the next fixture to play; 39 once the last is in
  log: [ MatchEntry ], // fixtures played, in order
}

MatchEntry = {
  week, opponent, home, gf, ga, outcome,             // as today's simulation.matches
  goals: Goal[],                                     // §5.2
  cards: Card[],                                     // F5
  played: { identity, cohesion, settle, mentality, changed },  // what the board was for this fixture
}
```

Derived, never stored: the user's fixture list (`buildUserFixtureList(order)`),
the rival rounds (`roundRobinSchedule(["__USER__", ...order])` simulated
with `roundRng(seed, k)`, C1's function), the table at any week
(`selectTable`), top scorers, form. All are memoised selectors on
`campaign`; rebuilding 342 rival results from the seed is microseconds.
Storing `order` rather than the 38 fixtures keeps the save canonical and
the validator short (M9).

`state.simulation` keeps its shape and its role: it is assembled by the
reducer when week 38 is played (`matches: campaign.log` with events,
`w/d/l/gf/ga/pts/position/table/tier/profile/familiarity/instructions/season`)
so `BackPage`, `summarizeSeason`, `GOTO_TRANSFER`'s promotion/relegation and
the save validator are unchanged or additive. `profile` and `familiarity`
in it are those of the *last* fixture; the record uses per-match values.

### 9.2 Actions

| Action | Replaces | Effect |
|---|---|---|
| `START_SEASON` | `SIMULATE` | `takeRng`; `order = rng.shuffle(opponents).map(name)`, `seed = rng.int(2**32)`; `campaign = { seed, order, week: 1, log: [] }`; phase `reveal`. No match is simulated. |
| `KICKOFF` | (same) | phase `matchday`. |
| `PLAY_MATCH` | — | Refused unless phase is `matchday`, `week ≤ 38`, and (F5) no starter is banned. Builds live assignments, the signature, the settling modifier, `familiarity = computeFamiliarity(live, instructions, formationKey, memory)`, `profile`; `simulateFixture` + `matchEvents`; appends the entry; `week + 1`; updates `cohesionMemory.matches` and (F5) `discipline`. On week 38: assembles `simulation`, phase `result`, `campaign` kept until `GOTO_TRANSFER` clears it. Consumes **no** `takeRng` (everything derives from `campaign.seed`), so tactical changes and swaps never shift results. |
| `PLAY_TO { until }` | — | `until ∈ { "half", "end", "defeat" }`. Loops `PLAY_MATCH` with the board frozen until the condition or a stopping point (week 19 when starting at or before it; week 38). One action, one autosave, one undo-free step. Refused for the same reasons as `PLAY_MATCH`. |
| `GOTO_TRANSFER` | (same) | also sets `campaign: null`, clears `discipline` (F5). `seasonHistory` entry gains `matches` (§9.4). |
| `CONTINUE_SEASON` | (same) | unchanged; C3 rolls `cohesionMemory.seasons`; `matches` resets to 0 at `START_SEASON`. |

`SIMULATE` is renamed because it no longer simulates; `App.jsx`'s
`NEXT_ACTIONS` and the sticky "Kick off" dispatch `START_SEASON`. The e2e
helper `playSeasonToWindow` changes from "Skip to end" to "Play to… → the
end of the season" twice.

### 9.3 Selectors

- `selectNextAction`: `matchday` → `{ key: "playMatch", label: "Play week 12: Arsenal (A)", tab: "season", week, opponent, home }`; with a banned starter (F5) → `{ key: "replaceSuspended", label: "Replace Adams (suspended)", tab: "squad", slotId }`. `tactics` keeps "Kick off season N".
- `selectTable(state, week = campaign.week − 1)`: rows for all 20 with `pts, w, d, l, gf, ga, gd, position`, sorted by points, goal difference, goals for, name (C1 defines the same order; if it lands first, this reuses it).
- `selectSettling(state)`: `{ signature, matches, modifier, changed }` for the next fixture, for the screen and for `PLAY_MATCH`.
- `selectTopScorers(log, n = 3)`: by `goals[].name` among `us` goals.
- `selectSeasonHistory` unchanged (the in-progress season joins at the window).

### 9.4 `summarizeSeason` and `seasonHistory`

Adds `matches: MatchEntry[]` (the lean entries: no `played.identity`
duplication beyond what the entry already holds) and `topScorer: { name, goals } | null`.
`isSeasonSummary` accepts `matches: []` for seasons recorded before this
feature.

### 9.5 Save format

Milestone C6 takes `saveVersion: 3` (ages, memory, budget). This work
takes **`saveVersion: 4`** with `migrations[3]`; if F ships before C6, it
takes 3 and C6 takes 4 — whichever lands second bumps.

`migrations[3]`:
- Adds `campaign: null`, `discipline: {}` (F5), `cohesionMemory.matches: 0`; every `seasonHistory[i]` gets `matches: []` and `topScorer: null`.
- A save in phase **`reveal`** (a v2/v3 save has a fully simulated but unseen season here) becomes phase **`tactics`** with `simulation: null`: the season restarts from kick-off. Nothing the player has seen is lost; the results will differ because they are now drawn per fixture. Stated in the changelog.
- A save in phase **`result`** keeps its `simulation` (the season was seen); the back page shows it with no scorers (the "Matches" rows don't expand), and the window opens as before.
- Every other phase is untouched.

`isValidState`: `campaign === null || isCampaign(campaign)` where
`isCampaign` checks `seed` uint32, `order` is 19 distinct strings equal
as a set to `opponents` names, `week` in 1..39, `log` is an array of
entries with weeks `1..week−1` in order, each with integer `gf/ga ≥ 0`,
`outcome` consistent, `goals` of length `gf + ga` with minutes 1..95 and
`us` counts matching, and `played` present. `PHASE_LABELS` gains
`matchday: "Match day"` (used by `describeSave`). `hydrateState` is
unchanged: a `matchday` save resumes on the match-day screen with the last
report shown instantly.

Size: `campaign` ≈ 6–8 KB at week 38 (log with events), `seasonHistory`
grows about 6 KB a season; a complete six-season save lands around 55 KB
against 16.5 KB today. Under the 512 KB iCloud KVS guard (plan §5) by a
wide margin.

### 9.6 Determinism

`tests/unit/reducer-determinism.test.js` extends: same seed and the same
sequence of actions → same log; and a season played as `PLAY_MATCH × 38`
equals `PLAY_TO end` twice equals `playSeason` (batch) when the board is
untouched. `rngCounter` advances once at `START_SEASON` and not at all
during the season.

---

## 10. Work in flight

### 10.1 Milestone C (career depth, concurrent)

| C task | Relationship | What this spec needs from it | Order |
|---|---|---|---|
| C1 real league (`simulateLeague`) | **Depends.** The live table needs rival results per round, not a season-end table. | Rival round *k* simulated from `roundRng(seed, k)` via a `simulateRound(round, teams, rng)` (or equivalent) that is independent of the user's profile, so rounds can be derived from `campaign.seed` at any week. If C1 lands as one batch inside `simulateSeason` on the shared stream, F1 refactors it into the round function; the numbers don't change, only the seeding. Table tie-break order shared. | F after C1. `seasons.json` re-records twice (C1's, then F1's); each in its own commit. |
| C2 ageing (`progressPlayer` at `CONTINUE_SEASON`) | Independent. | Nothing. Match entries store names, not player objects, so ageing between seasons doesn't touch the log. | Any. |
| C3 cohesion memory | **Shares a field.** | `computeFamiliarity(assignments, instructions, formationKey, memory)` with `memory = { seasons, matches }`; C3 adds the seasons bonus, F adds the settling modifier (§4.3) in the same place. `profiles.json` untouched (no memory in the golden inputs). | F after C3, or F introduces the argument and C3 extends it — agree which when the second one starts. |
| C4 window budget | Independent (between seasons). | Nothing. | Any. |
| C5 balance thresholds | **Extends.** `sim.mjs` keeps using the batch, so its numbers don't move. | One added assertion: a "change the style every week" strategy must not out-point a "keep the style" strategy over 400 seasons with the same squad (so the settling cost bites); the settling table in §4.3 is tuned until it does, in the same way C5 tunes synergy. | F5-style task inside F, after C5's thresholds exist. |
| C6 save v3 | Sequential. | Version 4 after it (§9.5). | F after C6, or swap numbers. |

Net: **F starts after C1 and C3 have merged**, and lands its golden
re-record after C5's. Everything else is independent.

### 10.2 Favourite-club colour theming (concurrent)

Nothing here assumes a static palette. The report, the form strip, the
fixture card and the ticker lines use only the semantic tokens
(`--win`, `--draw`, `--loss`, `--signal`, `--ink`, `--paper`, `--paper-2`,
`--rule`); no new colour token is introduced and no raw hex appears in the
new modules. Result tones are the existing `win/draw/loss` classes. The
share slip renders from computed styles at share time, so it repaints
with the club colours too. Visual snapshots for the new screens run in
light and dark, and in one club theme if the theming work adds a test
hook for it. If the theming work changes `--win`/`--loss` to derive from
club colours, the `check-contrast` pairs for result text on paper apply
to the derived values (that is the theming spec's problem to state; this
one only promises to use the tokens).

### 10.3 Free tier and native (05, D/E)

The boundary is unchanged: the window after season one. Season one is
now 38 stopping points instead of one, which makes the free tier a
longer game in minutes and costs nothing in the entitlements code.
Milestone D's TestFlight benefits from testing this loop, which argues
for F before E (M10).

---

## 11. Accessibility and native feel, specific to this feature

Everything in 04 §8 applies. In addition:

- The match-day sticky button label carries the fixture (`Play week 12: Arsenal (A)`), not just "Play", so screen readers and the keyboard shortcut announce what will happen.
- The report is an `article` with the score as its heading; scorers are a `dl` (term = minute, definition = name) so the timeline reads in order.
- The form strip has a visually-hidden summary ("Won 18, drawn 9, lost 11; last five: W W D L W").
- "Play to…" is a real sheet (focus trap, Esc), never a long-press.
- Haptics (native): light on Play, the existing success notification on the final verdict; none per goal.
- Reduced motion: no slip on the report, instant vidiprinter with Show all.

---

## 12. Acceptance criteria

- **Loop**: from pre-season, Kick off → reveal → Start season → 38 × Play produces a back page with 38 expandable reports; the record's season sheet shows the same 38 with form and top scorers.
- **Batch equivalence**: `PLAY_MATCH × 38` with an untouched board equals `playSeason(...)` byte-for-byte for `matches[].{week, opponent, home, gf, ga, outcome}` and the totals; `PLAY_TO end` twice equals the same.
- **Events**: for every entry, `goals.length === gf + ga`, `us` goals `=== gf`, minutes ascending, distinct, in 1..95, no goalkeeper scorer; over 400 seeded seasons the share of goals by a Poacher-on-Push striker exceeds that of a Blocker by at least 10× (statistical sanity).
- **Live table**: at every week, `selectTable` positions are consistent with the log plus rival rounds, and at week 38 equal `simulation.table`.
- **Settling**: changing the signature before a fixture shows the −3 note and records `played.changed = true`; six unchanged fixtures show +3; `sim.mjs --assert` includes the weekly-change ≤ keep-style check.
- **Pacing**: Playwright measures a season via "Play to…" the end (two taps, skip the feed) at ≤ the v2.0 vidiprinter path's time on the same runner; a single Play step renders the report within 100 ms on the CI runner.
- **Resume**: a `matchday` save reloads on the match-day screen with the last report visible and "Play week N" as the next action; a `reveal`-phase v2/v3 save migrates to `tactics` with a changelog note; a `result`-phase one still opens its window.
- **Determinism**: §9.6.
- **Sizes**: six-season save ≤ 80 KB; `check-bundle-size` still green.
- **Accessibility**: axe zero serious/critical on Match day, the Play to sheet, the report row and the record's season sheet in all three Playwright projects; keyboard-only season playable (K to play, Enter on rows); VoiceOver run-through on the match-day screen.
- **Copy**: no banned term in the new strings (`copy-lint`); every game term in the report is a `Term`.
- **No engine drift**: `profiles.json` unchanged; `seasons.json` changed only in F1's commit; `sim.mjs` cell values unchanged before and after F except the new assertion.
- The owner has played a season match by match and signed it off.

---

## 13. Milestone F (summary; tasks in the plan appendix)

| Task | Contents |
|---|---|
| F1 Engine | `fixtureRng`/`eventRng`/`roundRng`, `simulateFixture`, `playSeason`, `simulateSeason` as its wrapper, `matchEvents`; goldens re-recorded in one commit; unit tests for events and equivalence |
| F2 State | `campaign`, `matchday` phase, `START_SEASON`/`PLAY_MATCH`/`PLAY_TO`, settling via `cohesionMemory.matches`, selectors, `summarizeSeason.matches`, save v4 + migration, validator, determinism tests |
| F3 Screens | `MatchDay`, `MatchReport`, `FixtureCard`, `PlayToSheet`; `Vidiprinter` as fast-forward; `Preseason`, `BackPage`, `Strengths`, `SeasonTab`, `App` changes; shortcuts; e2e and snapshots |
| F4 Record | Season sheet with form, top scorers, match list; career top scorer and biggest win; career-complete slip |
| F5 Discipline *(M3)* | Cards in `matchEvents`, `discipline` state, bans block Play, "Replace X (suspended)" next action, marker mark |
| F6 Release | `sim.mjs` settling assertion, ten-season soak with random weekly changes, changelog, version bump, tag |

---

## 14. Owner decisions

| # | Decision | Recommended default | Why |
|---|---|---|---|
| M1 | Do the rivals' fixtures for a week resolve with the user's match, or does the user's match "unlock" the week? | **With it.** Rival results derive from the season seed and are revealed when the user's week is played; nothing is computed ahead that the player can see. | The table must move week by week for the lean to be a decision (§3.2); whether the numbers exist earlier is invisible. |
| M2 | Fast-forward options | Next match / the half or the end / the next defeat / the end of the season | Keeps the old pace available in two taps; "next defeat" is the natural "sim to the next decision point". |
| M3 | Cards and one-match bans (F5) | **Yes**, as a separable task | It is what gives the bench a job (§3.2); injuries stay out. |
| M4 | Name opposition scorers | No; minute and club only | The opponent model has no squad; naming from the dataset is inconsistent for promoted clubs. Revisit with opponent styles. |
| M5 | Assists | No | A second attribution with no decision behind it. |
| M6 | A mid-season window | No; between seasons only | C4's budget is per season; the draft identity is one XI per season. |
| M7 | Settling numbers | −3/−2/−1/0/+3 over 0/1/2/3–5/6+ matches, tuned under a `sim.mjs` assertion | Visible, small, tunable; the assertion keeps it honest. |
| M8 | Keep the Pre-season screen | Yes | It is the once-a-season stop and where the reveal is launched. |
| M9 | Store rival rounds and the fixture list, or derive them from the seed | Derive; store `seed` + `order` | Smaller save, shorter validator, nothing to drift. |
| M10 | Where F sits | After C (v2.5), before the App Store submission (E), as a web release **v2.7**; the roadmap's Phase 3 entry is then "first slice shipped in v2.7; live view, in-match changes and injuries remain" | TestFlight should test the loop; the milestone is UI + state, not native. Owner to confirm the version number. |
| M11 | Report contents beyond goals | Score, scorers with minutes, the line you played, the table line; cards with F5; nothing else | The engine has no other real numbers (§6). |
| M12 | Keep the per-match log in `seasonHistory` | Yes, lean entries | ~6 KB a season; it is what the record is for (§8.2). |
| M13 | Migrate a `reveal`-phase save by restarting its season from kick-off | Yes | Nothing seen is lost; the alternative (a whole batch season in the new format) is more code for a state that exists for seconds. |
| M14 | Formation changes mid-season | No (not offered after the draft today either) | `SET_FORMATION` resets the squad; a proper formation switch is its own feature. |

---

## Appendix A: `matchEvents` in outline

```js
export function matchEvents({ gf, ga }, starters, rng, { cards = false, tackling = 50 } = {}) {
  const total = gf + ga;
  const minutes = new Set();
  while (minutes.size < total) minutes.add(rng.next() < 0.08 ? 91 + rng.int(5) : 1 + rng.int(90));
  const sides = rng.shuffle([...Array(gf).fill(true), ...Array(ga).fill(false)]);
  const outfield = starters.filter((a) => a.player && a.type !== "GK");
  const weights = outfield.map((a) => Math.max(0, playerContribution(a).att));
  const pickScorer = () => weightedPick(outfield, weights, rng) ?? rng.pick(outfield);
  const goals = [...minutes].sort((a, b) => a - b).map((minute, i) => {
    if (!sides[i]) return { minute, us: false };
    const a = pickScorer();
    return { minute, us: true, slotId: a.slotId, name: a.player.name };
  });
  return cards ? { goals, cards: bookings(starters, tackling, rng) } : { goals };
}
```

`weightedPick` is a small helper in `engine/util.js` (one `rng.next()`,
cumulative weights). `bookings` (F5) draws a Poisson count scaled by
tackling, then a carrier per card weighted by `def + press`.

## Appendix B: new strings (`content/strings/en-GB.json`)

```
"season.play":        "Play week {week}: {opponent} ({venue})"
"season.playTo":      "Play to…"
"season.next":        "Next · Week {week} · {venue}"
"season.after":       "After week {week} · {position} · {pts, plural, one {# pt} other {# pts}}"
"season.settled":     "Settled in: {count, plural, one {# match} other {# matches}} in this system ({modifier})"
"season.changed":     "Just changed: cohesion {modifier} this match"
"season.topScorer":   "Top scorer: {name}, {count, plural, one {# goal} other {# goals}}"
"season.suspended":   "Replace {name} (suspended)"
"season.misses":      "{name} misses the next match"
"season.noLog":       "No match log for this season."
"season.form":        "Won {w}, drawn {d}, lost {l}; last five: {last}"
```
