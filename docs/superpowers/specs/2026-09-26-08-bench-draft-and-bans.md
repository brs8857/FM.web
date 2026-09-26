# Spec 8: The bench draft, league bans and auto-cover

| | |
|---|---|
| **Status** | Approved 2026-09-26 with the §8 defaults ("go ahead with milestone g"); built as milestone G, v2.8.0. Where the build differs from this text, §11 says how |
| **Date** | 2026-09-26 |
| **Series** | 8 of the redesign series (01–07 plus the plan) |
| **Baseline** | v2.7.0 plus the audit fixes (`3c1bbc5`) |
| **Inputs** | Owner requests of 2026-09-26: "the draft process continues for the bench, where your bench players are selected from random teams, but all positions can be selected, not just one, the bench size increases to 10", and, on bans, "Both": Premier League-style thresholds and an auto-cover setting for Play to…; [07](2026-09-25-07-match-day-experience.md) §5.4 (cards and bans as built) |
| **Plan** | **Milestone G** in [2026-09-25-redesign-and-app-store.md](../plans/2026-09-25-redesign-and-app-store.md) |

Today the draft stops at eleven and the game fills a bench of six on its
own, from the XI's own club-seasons. Bans come from a rule of our own (a
red, or every fifth yellow, is one match), which stops a season 9.6 times
on average. This spec makes the bench part of the draft, brings the bans
into line with the Premier League's, and lets Play to… cover a ban from
the bench without stopping.

---

## 1. Goals

1. After the eleventh pick, the draft goes on for **ten bench picks**.
   Each bench pick draws club-seasons at random from the career's era, as
   the XI's picks do, and **any player in the squad can be taken**, not
   only one position.
2. Bans follow the **Premier League's thresholds**: five yellows by week
   19, ten by week 32 and fifteen in the season; a straight red costs
   three matches and a second yellow costs one.
3. A career setting, **Cover bans from the bench**, lets Play to… swap in
   the best fit for a suspended starter and put the starter back once the
   ban is served, with no stop.

## 2. Non-goals

- Injuries, fitness and rotation (roadmap Phase 3 proper).
- A matchday squad or substitutes within a match. The bench is still the
  squad outside the XI; nobody comes off the bench during a match.
- Bans carrying over the summer. They still clear when the window opens
  (07 §5.4).
- Any change to `simulateMatch`, the team profile or the balance table.
  The bench never adds strength to the XI; it only matters when someone
  steps into it.

---

## 3. What the numbers say

Measured on the engine as it stands (400 random-pick 4-3-3 XIs, one
season each, default Tackling, banned starters left out of the match that
they miss):

| Rule | Bans a season | 90th percentile | Worst | Starter-matches missed |
|---|---|---|---|---|
| Today (red or every 5th yellow, 1 match) | 9.6 | 12 | 17 | 9.3 |
| Premier League thresholds, reds split 50/50 | **5.4** | 8 | 13 | 8.2 |

Under the league's rule, 3.5 bans a season come from yellows and 1.9
from reds. A real top-flight side collects about four to six suspensions a
season, so the new rule lands where the game should. The missed matches
barely fall (a straight red now costs three), so the bench matters more
than before, which is the point of drafting it.

The red rate itself (0.05 per match, scaled by Tackling) is unchanged; so
is the yellow rate (Poisson 1.6, scaled). Tackling keeps its downside.

---

## 4. The bench draft

### 4.1 The flow

1. Pick eleven as today. After the eleventh, the draft does **not** end:
   the heading becomes **Bench** and the line under the board reads
   "Bench pick 1 of 10".
2. **Draw** deals three club-seasons from the era, at random, with the
   same no-dead-ends rule as the XI (a squad with nobody left is passed
   over).
3. Opening a cutting shows the whole squad in shirt order, each row with
   its position code. There is no slot to fit, so no row is marked "off"
   and no side preference applies. Every row can be picked, except players
   already at the club (by id and by identity, as today).
4. The bench gets **its own two redraws**, separate from the XI's.
5. **Fill the bench for me** finishes the remaining picks in one step
   (§4.3). It is there for players who only want the eleven; it is a
   secondary button, never the default.
6. After the tenth bench pick, or the fill, **Go to the board** appears as
   today.

The career code still reproduces the draft: bench draws take from the
same `rngCounter` as the XI's, after them, so a code gives the same XI
draws as before and the same bench draws after that.

### 4.2 What the draft shows while picking the bench

- The squad strip gains a bench line: "Bench 4 of 10 · GK 1 · DEF 1 · MID
  1 · ATT 1", counting by the position group of each player's `slot`.
- A **Coach's note** on the first bench pick (dismissable, stored in
  `seenNotes` as `bench-draft`): "Anyone from these squads can sit on
  your bench. A keeper and one for each line will cover you when bans
  come." This is guidance only; no position is required.
- Era spread and cohesion stay a function of the XI alone. A bench pick
  shows no era or cohesion preview, since it changes neither until the
  player starts.

### 4.3 Fill the bench for me

For each remaining pick: deal a draw as above and take the highest-rated
available player from the three squads, except that if the bench has no
goalkeeper by the last pick, the last pick takes the best keeper on offer
(dealing again, up to the same retry limit as a draw, if none is). This
replaces `autoFillBench`, which today takes from the XI's club-seasons.

### 4.4 A bench of ten everywhere else

- `signToSlot` and `signToBench` (the window): a full bench is now ten;
  the weakest still makes room.
- `progressSquad` (the summer) already fills a retiring starter's place
  from the best-fitting bench player; a deeper bench just fails less.
- Squad tab: the bench section lists ten rows, grouped by position in
  the order GK, DEF, MID, ATT, with the ban mark as today.
- Save validation: `bench.length <= 10`.

---

## 5. League bans

### 5.1 The rule

State keeps `discipline: { [playerId]: { yellows, banned } }`, but
`yellows` becomes the **season's running total** (it no longer resets at a
ban). After each match, for each of our cards in minute order:

| Card | Effect |
|---|---|
| Yellow | `yellows + 1`. Reaching **5** in weeks 1–19 bans for **1** match; reaching **10** in weeks 1–32 bans for **2**; reaching **15** at any point bans for **3** |
| Second yellow (sent off) | Ban for **1** match. The two yellows do not count toward the running total |
| Straight red | Ban for **3** matches |

`banned` counts matches still to serve and drops by one after each match
played. A new ban while one is running takes the longer of the two (the
engine never stacks bans; with one ban at a time this never arises in
practice, but the rule must be defined).

### 5.2 Engine change

`bookings` already decides whether a red is shown; when it is, a second
draw on the same event stream decides its kind: `"second-yellow"` or
`"red"`, 50/50. The draw happens after every goal has been placed, so no
scoreline or scorer changes; only cards and bans differ from v2.7.

`nextDiscipline(discipline, cards, week)` takes the week so the 19 and 32
cut-offs apply. It returns `bans: [{ id, name, matches }]`.

### 5.3 What the player sees

- Match report: "Booked: Keane." / "Sent off: Adams (second yellow)." /
  "Sent off: Adams." The line after it names the ban: "Adams misses the
  next 3 matches."
- Player sheet: the season's yellows ("4 yellows, one short of a ban"
  until week 19; "9 yellows" before week 32) and, when banned, "Suspended:
  2 more matches".
- The ban mark on the board and the Squad tab is unchanged.

---

## 6. Auto-cover

### 6.1 The setting

A toggle in the **Play to…** sheet, under the options: **Cover bans from
the bench**, sub-line "The best fit comes in; the starter goes back after
the ban". It is stored in the save (`autoCover`, a career setting, not a
device preference), because it changes who plays. Default **on**.

### 6.2 What it does

During Play to…, before each match, for each starter with `banned > 0`:

1. Choose the cover with the rule `progressSquad` already uses
   (`benchFitIndex`): the best-rated bench player of the same position,
   else the best of the same kind (keeper for keeper, outfield for
   outfield), skipping anyone banned.
2. Swap them as the manual bench-to-slot swap does (default job and
   brief for the slot) and record `covers: [{ slotId, starterId, coverId }]`.
3. If nobody fits, the side plays a man short, as today.

Before each later match, a cover whose starter has served the ban is
reversed, **only if** both players are still where the cover put them. If
you have moved either of them since, the cover is dropped and your
arrangement stands. All covers are reversed or dropped when the window
opens.

The fast-forward feed notes each cover in its line for that week:
"WK 12  SPURS (H)  0-2   Campbell in for Adams (suspended)".

### 6.3 Single matches

Pressing **Play** for one match never swaps anyone on its own. When a
starter is banned, the next-action pill still reads "Replace Adams
(suspended)", and the swap sheet it opens leads with the suggested cover
("Campbell, the best fit") so the swap is one tap. With auto-cover off,
Play to… stops at a ban as it does today.

---

## 7. State, actions and save

### 7.1 State

| Field | Change |
|---|---|
| `draftStage` | New: `"xi"` → `"bench"` → `"done"`. `draftDone` becomes a selector (`draftStage === "done"`) |
| `benchDraw` | New: `{ redrawsLeft: 2 }`. The draw itself reuses `draw.options` |
| `bench` | Up to 10 entries |
| `discipline[id].yellows` | Season total (§5.1) |
| `autoCover` | New, boolean, default `true` |
| `covers` | New, `[{ slotId, starterId, coverId }]`, empty outside a season |

### 7.2 Actions

- `LAND` and `REDRAW`: in the bench stage, build each option with a new
  `buildBenchPool(getSquad, year, clubId, draftedIds, identities)` (every
  available player, shirt order) and spend `benchDraw.redrawsLeft`.
- `PICK_PLAYER`: in the bench stage, append to `bench`; the tenth pick
  sets `draftStage: "done"`. The eleventh XI pick sets `"bench"` instead of
  auto-filling.
- `FILL_BENCH`: §4.3.
- `SET_AUTO_COVER { on }`.
- `PLAY_TO`: applies covers before each match when `autoCover` is on; stops
  at a ban when it is off (today's behaviour).
- `COVER_BAN { slotId }`: the one-tap cover of §6.3, recorded in `covers`
  like an automatic one.

### 7.3 Save v5

`SAVE_VERSION` 4 → 5, with `migrations[4]`:

- `draftStage`: `"done"` when `draftDone` was true (the bench of six was
  already filled), else `"xi"`. Old benches of six stay six; there is room
  for four more from the window.
- `benchDraw: { redrawsLeft: 2 }`, `autoCover: true`, `covers: []`.
- `discipline` kept as is. Mid-season saves carry "yellows since the last
  ban" into a field that now means "season total"; the difference is at
  most four yellows for one season and is not worth a heuristic.
- Validator: `bench.length <= 10`; `banned` an integer 0–3; `covers`
  entries refer to a slot and two players at the club.

### 7.4 Determinism and golden masters

- Bench draws use `takeRng`, after the XI's; XI draws for any career code
  are unchanged.
- No golden master records cards (checked: none of `tests/golden/*.json`
  has a card field), and the red-kind draw comes after every goal, so the
  golden files do not change.
- `profiles.json` never changes. `sim.mjs` cells never change (the sim has
  no bench and no bans).

---

## 8. Owner decisions (defaults)

| # | Decision | Default |
|---|---|---|
| G1 | Bench size | 10 (owner, given) |
| G2 | Positions on the bench | Any, no requirement (owner, given) |
| G3 | Bench redraws | 2, separate from the XI's 2 |
| G4 | "Fill the bench for me" | Offered as a secondary button |
| G5 | Keeper on the bench | A note only; the fill takes one if you have none |
| G6 | Ban thresholds | Premier League: 5 by week 19, 10 by week 32, 15 in the season (owner, "Both") |
| G7 | Reds | Straight red 3 matches, second yellow 1; the red rate split 50/50 |
| G8 | Bans over the summer | Cleared, as today |
| G9 | Auto-cover | In Play to…, stored in the save, **on** by default (owner, "Both") |
| G10 | Single Play with a ban | No automatic swap; the swap sheet leads with the suggested cover |
| G11 | Release | v2.8.0, web, before milestone D |

---

## 9. Build order (milestone G)

- **G1 Engine:** `buildBenchPool`; `nextDiscipline` with weeks, thresholds and the red split; `bookings` kind draw; `coverFor(assignments, bench, slotId, discipline)` from `benchFitIndex`; bench limit 10 in `signToSlot`/`signToBench`. Unit tests for each threshold (5th yellow in week 19 bans, in week 20 does not; 10th in week 32 bans 2; 15th bans 3), a second yellow not adding to the tally, a ban decrementing over three matches, the cover choice (same position first, never a banned player), a full bench of ten losing its weakest.
- **G2 State:** `draftStage`, `benchDraw`, the bench path through `LAND`/`REDRAW`/`PICK_PLAYER`, `FILL_BENCH`, `autoCover`, `covers`, `PLAY_TO` covering and reversing, `COVER_BAN`; save v5 and migration fixtures (a v4 save mid-draft, drafted, mid-season with a ban). Determinism test: a career code gives the same XI draws as v2.7 and the same bench on every run.
- **G3 Screens:** Draft bench stage (heading, pick counter, whole-squad cutting sheet, bench line in the squad strip, coach's note, fill button); Squad tab bench of ten grouped by line; Play to… toggle; swap sheet leading with the cover; report and feed lines; player-sheet discipline lines. Axe clean, no sideways scroll at 375 px, both themes.
- **G4 Measure and release:** a ban-rate check in `sim.mjs --bans` (the §3 table, asserting 4–7 bans a season at default Tackling); Playwright: draft eleven plus ten, then play a season with auto-cover on and assert Play to… the end finishes without stopping; the same with it off stops at the first ban. `CHANGELOG`, version 2.8.0.

## 10. Acceptance criteria

1. A new career drafts 11 then 10, and every squad row is pickable during
   the bench stage.
2. The same career code gives the same XI and the same bench.
3. Over 400 seasons at default Tackling, bans average 4–7 a season.
4. With auto-cover on and a bench that has a fit, Play to… the end never
   stops for a ban, and each covered starter is back in his slot the match
   after his ban ends unless you moved him.
5. With auto-cover off, the game behaves as v2.7 does at a ban.
6. v4 saves in every phase load, migrate and play on.
7. Unit, e2e, axe, contrast, bundle and balance gates all pass.

---

## 11. As built (v2.8.0)

- **No new draft fields.** `draftStage` is the selector `selectDraftStage`:
  "xi" while a slot is empty, "bench" once the XI is full and `draftDone`
  is still false, "done" after. The eleventh pick resets
  `draw.redrawsLeft` to two for the bench instead of a separate
  `benchDraw`. A 2.7.0 save needs nothing for either: its `draftDone` is
  already true.
- **Save v5** adds only `autoCover` and `covers`. Logs keep 2.7.0's
  name-only bans as they are (the validator and the report read both
  shapes) rather than rewriting them.
- **No fit of the same kind.** Auto-cover never puts an outfielder in goal
  or a keeper outfield; when nobody of the right kind is free, Play to…
  stops at the ban exactly as it does with auto-cover off.
- **The feed** gives a cover its own line under that week's result rather
  than lengthening the result line, so the 38 lines keep their columns.
- **A cover is restored right after** the match that ends the ban, so the
  board already shows the starter back before the next fixture.
- Measured with `npm run sim -- 1000 --bans`: 5.25 bans a season at the
  default Tackling (p90 8, worst 12), 2.9 at 20 and 8.4 at 80.

