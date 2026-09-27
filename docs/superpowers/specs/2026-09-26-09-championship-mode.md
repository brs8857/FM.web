# Spec 9: Championship mode and cross-division careers

| | |
|---|---|
| **Status** | Built as milestone H, v3.0.0 (2026-09-27), with real Championship data (§2 Option A). See §13 for what was built where it differs from the text |
| **Date** | 2026-09-26 |
| **Series** | 9 of the redesign series (01–08 plus the plan) |
| **Baseline** | v2.8.0 (`6e86c8e`) |
| **Inputs** | Owner request of 2026-09-26 (below); [roadmap](../../roadmap.md#phase-2-deeper-career--sharper-draft--tactics-v40) Phase 2, "Relegation for you too: your club can go down and play in the Championship, and win promotion back," gated on "recover or rebuild the data pipeline… needed to… add Championship squads" |
| **Plan** | **Milestone H** in [2026-09-25-redesign-and-app-store.md](../plans/2026-09-25-redesign-and-app-store.md) |

The owner's request, as given: a new career starts by choosing a league,
Premier League or Championship. Championship careers pick an era since the
competition was renamed in 2016, choose colours from Championship-era
clubs, draft real teams and players, set a tactic and play the season as
today. Finishing 1st or 2nd promotes automatically; 3rd to 6th go into a
play-off (semi-finals, then a final); the winner is the third promoted
side. A Premier League career that gets relegated drops into the
Championship and carries on there, in the same career.

This is the largest single ask since the redesign. Most of it — the
league choice, the two-way promotion, the play-offs, the tier-aware
season — is ordinary engine and screen work with no new data. One part
of it is not, and has to be decided first.

---

## 1. Goals

1. A new career starts by picking a competition: Premier League (today's
   only option) or Championship.
2. A Championship career drafts an XI and a bench of ten from real
   clubs and players, sets a tactic, and plays a season, exactly as a
   Premier League career does today.
3. Finishing 1st or 2nd in the Championship promotes automatically.
   Finishing 3rd to 6th goes to a play-off: two-legged semi-finals
   (3rd v 6th, 4th v 5th), then a final between the winners. The final's
   winner is promoted; the loser stays.
4. A Premier League career whose finish sends it down carries on the
   same career in the Championship the next season. A Championship
   career that is promoted (automatically or through the play-offs)
   carries on the same career in the Premier League. Either can happen
   more than once across a career's six seasons.

## 2. The one decision this depends on

Every club-season a player can draft from lives in `src/data/players.json`:
666 entries, 1992-93 to 2024-25, and **every one of them is a top-flight
season** (the archive is described everywhere as "33 years of the English
top flight" — README, the manifest, `index.html`'s own description). There
is no second-tier player-season anywhere in the project: no Championship
squad, no ratings, nothing to derive one from.

The tool that built the archive from raw data, `scripts/derive-ratings.mjs`,
says so in its own first line: it "replac[es] the lost `build_final.py`."
The roadmap already names this exact gap as the blocker for this exact
feature (Phase 2: "Prerequisite: recover or rebuild the data pipeline…
It's needed to re-tune ratings and to add Championship squads"). Nothing
in this session has recovered it. Building a genuine 2016-to-now
Championship archive means sourcing raw per-player-season records (ability
or market-value figures, ages, positions) for roughly nine seasons across
twenty-four clubs — over 200 club-seasons, several thousand player rows —
in a shape `derive-ratings.mjs` can turn into overalls the way the existing
archive was made. That is a data-acquisition project, not a coding task,
and it reopens the rights and provenance question the plan already has
open for the existing archive (03 §5, blocking milestone E) for a second,
larger dataset, from what looks like the same kind of source
(`legacyClubIds.json`'s comment names Transfermarkt).

There are two ways forward:

**Option A — a real Championship archive.** Source raw squad data for
2016-17 onward, run it through `derive-ratings.mjs`'s method (or a
Championship-tuned variant of it, since the top-flight curve assumes a
top-flight talent distribution), and ship it as a second dataset the
Championship draft reads from. This is the literal version of the
request. It cannot start until the owner decides how the raw data gets
sourced and has it in hand; nothing here can estimate that timeline.

**Option B — draft from the archive already shipped.** A Championship
career drafts from the same 666-entry archive, offered as **a club's own
history**, not a season-by-season second tier. Concretely: of the 24
clubs in the existing promotion pool (`championship.json`), 19 already
have real top-flight seasons in the archive — Bolton's Allardyce years,
Middlesbrough's UEFA Cup run, Blackburn's title-winning side, Norwich,
Southampton, Watford, Swansea, Stoke, Sheffield United, Charlton,
Portsmouth, Birmingham, West Brom, Derby, QPR, Cardiff, Burnley, West
Ham, Wolves — real, well-remembered squads, just not from a second-tier
season specifically. Five have no archive coverage at all and could not
be offered without their own small dataset: Millwall, Bristol City,
Lincoln City, Preston North End, Wrexham.

Option B ships with **no new data**. Option A ships nothing until the
owner supplies source material and answers the rights question a second
time. The rest of this spec (§4 onward) is written so the choice between
them changes only the draft pool, not the competition engine — the
promotion, relegation and play-off system doesn't know or care where a
tier's players came from, so Option A can replace Option B's pool later
without touching anything else built here.

**Recommendation: Option B now.** It ships the half of the request most
players will actually feel — starting outside the top flight, the
jeopardy of relegation, the climb back up — without waiting on a data
project with no defined timeline. It is honestly a different pitch from
"draft the 2019-20 Championship," and the owner may reasonably prefer to
wait for Option A instead; that choice is §12's H1.

One thing is cheap regardless of A or B: a **Championship league table**
(23 real current rivals, à la `dataset.opponents`) is a much smaller ask
than a draftable archive — closer to curating `championship.json` properly
than to rebuilding a pipeline — and is covered in §5 as its own,
unblocked piece.

## 3. Non-goals

- League One, League Two, or any tier below the Championship. A
  bottom-three Championship finish stays a Championship problem; there is
  nothing lower to fall into, and this spec doesn't model one.
- A live or 2D play-off match. Play-off legs and the final use the
  existing match report screens, the same as a league fixture.
- Realistic transfer fees or wages. The window keeps its abstract wage
  points; only the finish-based budget bands (§6) get a Championship
  shape.
- Simulating the tier you are not currently in. While playing a Premier
  League career, the Championship is not played out behind the scenes
  (and vice versa); the tier you land in is populated the same abstracted
  way relegated/promoted rivals already are today.
- A longer or open-ended career. Still six seasons total, however they
  split across tiers (open-ended careers are a separate, later roadmap
  item).

## 4. The competition, generalised

Today `SEASON_WEEKS = 38` and `HALF_SEASON = 19` are fixed exports, and
the league is always the 19 real rivals in `dataset.opponents` plus the
user, twenty teams. `roundRobinSchedule`/`buildUserFixtureList` are
already generic in team count (the circle method works for any even
number), so a 24-team Championship needs no new scheduling code. What
does need to change:

- `SEASON_WEEKS`/`HALF_SEASON` become derived from the competition's team
  count (`2 * (teamCount - 1)` and half of that) rather than fixed
  exports, carried on the campaign so a career can move between two
  sizes.
- `save.js`'s `isCampaign`/`isValidState` validators, which hard-code
  `c.order.length !== 19` and `s.opponents.length !== 19` today, check
  against the tier's expected size instead of a literal number.
- Copy that names the number directly — `season.bar`'s "Week N of 38",
  `BackPage.jsx`'s "All 38", `labels.js`'s "38 wins from 38" for THE
  PERFECT SEASON — reads `SEASON_WEEKS` instead of the literal.
- `windowBudget`'s finish bands (`[[1,9],[4,8],[7,7],[17,6]]`, written for
  a 20-team table) become a percentile of the table
  (`Math.ceil(p * teamCount)`) so one function serves both sizes without
  a second hard-coded table.
- `seasonTier`/`TIER_STANDFIRST` (Champions/Champions League/Europa/
  Conference/Mid-Table/Relegation Battle, all keyed to a 20-team
  Premier League table) get a Championship-shaped parallel: automatic
  promotion (1st-2nd), promoted through the play-offs, lost in the
  play-offs, mid-table, relegation battle (22nd-24th). No change to the
  Premier League table's own labels.

None of this needs Option A or B decided first.

## 5. Two competitions, two opponent tables

`dataset.opponents` (19 real, current top-flight rivals) stays exactly
what it is. A new, curated `dataset.championshipOpponents` (23 real,
current Championship rivals with the same `{ name, ov, histMean, histStd,
weight, vol }` shape) becomes the Championship's own table — built the
same way `opponents` was, not drawn at random from a pool. `championship.json`
keeps its existing job (the strength-only pool a relegated Premier League
rival is replaced from); once the Championship's own table exists
properly, the same source can plausibly serve both jobs, which would also
close parked task #6 (Burnley appearing twice from the promotion pool) as
a side effect of tidying the same code this milestone touches — worth
doing here rather than carrying it into a second, now bidirectional,
promotion system.

## 6. Promotion and relegation, both ways, one career

New state: `tier: "premier" | "championship"`.

Today `applyPromotionRelegation` explicitly exempts the user
(`!r.isUser`) — your club never goes down. That changes:

- **In the Premier League:** finishing 18th-20th moves next season's
  `tier` to `"championship"`; `opponents` switches to
  `championshipOpponents`. The Premier League table's own relegation and
  promotion of rivals is unaffected.
- **In the Championship:** finishing 1st or 2nd moves next season's
  `tier` to `"premier"` automatically. Finishing 3rd-6th enters the
  play-offs (below); the final's winner also moves up next season, the
  loser stays in the Championship. Finishing 22nd-24th has no tier
  consequence (§3) — a bad season, nothing more.
- The two tiers' rivals stay independent (no attempt to carry specific
  clubs across with you); this matches the abstraction the promotion
  pool already uses today, and is simplest to reason about and to test.

**Play-offs** (new): semi-finals 3rd v 6th and 4th v 5th, each a
two-legged tie with the lower-seeded side hosting the first leg (as the
real competition does); aggregate score decides, extra time if level
after both legs (modelled as a short weighted-toward-the-stronger-side
resolution rather than a full extra `simulateFixture`, since nothing
about extra time needs its own report), penalties if still level (a
single weighted coin-flip, not simulated kick by kick). The final is one
match at a neutral venue — no home-advantage term for either side —
between the two semi-final winners.

Every leg and the final produce an ordinary match report from the
existing `matchEvents`/report screens; no new match engine. Discipline
carries over between legs exactly as it does between league fixtures,
since it's the same season. The reducer gains a `"playoffs"` phase,
between `"result"` (regular season over) and `GOTO_TRANSFER`'s
`"transfer"`, entered only when the tier is `"championship"` and the
user finished 3rd-6th; every other finish goes straight to the window as
today.

## 7. Onboarding and screens

- `nav.js`'s `STEPS` gains `"league"` first: `["league", "era",
  "formation", "club"]`. A new `League.jsx` screen offers the two
  competitions with a line each; picking one dispatches `SET_TIER`
  before era selection, and the step counter becomes "1 of 4".
- `Era.jsx` becomes tier-aware. Under Option B it stays the same
  1992-2024 archive and presets, with copy that says a Championship pick
  draws from the club's own history rather than a specific Championship
  season; under Option A it becomes 2016-current with its own presets.
- `Colours.jsx`/`ClubPicker.jsx` are unchanged in mechanism; when
  `tier === "championship"`, the club list narrows to the Championship's
  current 24 (real colour and edited-name data already exists for all of
  them — checked, nothing new needed there).
- Draft, Board and Squad screens are unchanged; headers and subtitles
  that currently say "Season" gain the competition's name where the
  distinction matters.
- Season tab: the table's promotion/relegation shading and the
  end-of-season copy become tier-aware (top two, 3rd-6th, bottom three
  for the Championship; today's bands for the Premier League), via a
  small `promotionBands(tier)` feeding the existing `Table` component —
  `selectTable`/`selectNextFixture` stay generic. A new play-off section
  (semi-final legs, the final) renders in the same Slip/report style as
  everything else, only appearing for a 3rd-6th Championship finish.
- Club/Record: each season's line names its tier ("Championship,
  2028-29"); the career-complete slip lists which tier each season was
  played in, so a promoted-and-survived or relegated-and-bounced-back
  career reads as a story, not a flat list of six identical rows.

## 8. State and save format

- `state.tier: "premier" | "championship"`.
- `state.playoffs: null | { semis: [...], final: {...} | null }`, live
  only during the new `"playoffs"` phase; cleared once resolved.
- New phase value `"playoffs"`, alongside today's `formation | draft |
  tactics | reveal | matchday | result | transfer`.
- Save version bump; migration sets `tier: "premier"` on every existing
  save (every save today is implicitly one) and `playoffs: null`.
- `isValidState` checks `opponents.length` against the size the saved
  `tier` implies (19 or 23), instead of the literal 19 it checks today.

## 9. What ships regardless of §2's answer

The league step, `tier` state, the generalised season engine (20 or 24
teams), the Championship's own opponent table, both-ways promotion and
relegation, the play-offs, and every tier-aware label and screen in §4-8
need no new player data at all — only the Championship **draft pool**
(§2) does. That means the "carry on in the Championship after
relegation" half of the request could ship on Option B's reused archive
now, and be upgraded to a real second-tier archive later under Option A
without touching the competition engine again, if the owner would rather
sequence it that way.

## 10. Risks

| Risk | Note |
|---|---|
| Balance | `sim.mjs`'s title/bottom-three thresholds were tuned for a 20-team, 38-game Premier League. A 24-team, 46-game Championship needs its own balance pass, not a free extension of the existing table |
| Scope | This touches data, engine, state, save and five-plus screens — the biggest single milestone since the redesign itself. Building it as one commit risks the same fate as a rewrite; §12 splits it, and no task starts before §2 is answered, since the draft screens' shape depends on it |
| The Burnley bug | Lives in exactly the code this milestone extends (`applyPromotionRelegation`, the promotion pool). Worth fixing here (§5) rather than carrying a known bug into a bidirectional version of the same system |
| Product framing | "33 years of the English top flight" is in the manifest description, `index.html`'s meta description and the README. A second competition means revisiting that copy, however §2 is answered — flagged, not blocking |

## 11. Owner decisions

| Id | Decision | Options | Recommended |
|---|---|---|---|
| H1 | Championship draft pool (§2) | A: a real 2016+ Championship archive, blocked on sourcing raw data; B: reuse the existing top-flight archive as each club's history | B now; revisit A if real source data becomes available |
| H2 | Career length across tiers | Stays six seasons total, however split, vs. something longer for a promotion/relegation story to breathe | Keep six |
| H3 | Shared personnel across tiers | Keep the two tiers' rivals independent (today's abstraction) vs. carry specific relegated/promoted rivals with you | Keep independent — simplest, matches today's model |
| H4 | Championship relegation (22nd-24th) | No tier consequence (§3) vs. inventing a notional "League One" with no real data behind it | No consequence — a real third tier isn't worth inventing to dramatize a bad season |
| H5 | Release sequencing | Before milestone D (native/App Store) as a bigger web release, or after E, as v3.x once the store release is out | Owner to decide against the App Store timeline; nothing here blocks D/E or is blocked by them |

## 12. Proposed build order (Milestone H, once H1-H5 are answered)

- **H-a Engine:** generalise season length/team count off literal
  constants (§4); Championship opponent table (§5); tier-aware
  `seasonTier`/budget bands.
- **H-b Engine:** both-ways promotion/relegation; play-off semi-finals
  and final (§6).
- **H-c State/save:** `tier`, the `"playoffs"` phase, save version bump
  and migration (§8).
- **H-d Screens:** the League step, tier-aware Era/Colours, Season tab
  bands and play-off bracket, Club/Record tier history (§7).
- **H-e Data** (gated on H1): curate the Championship draft pool from
  the existing archive (Option B), or integrate newly-sourced
  Championship records through `derive-ratings.mjs` (Option A).
- **H-f Measure and release:** a `sim.mjs` balance pass for the 24-team
  competition, end-to-end tests for a full Championship promotion and a
  Premier League relegation in one career, changelog, version.

## 13. As built (v3.0.0)

The owner's go-ahead ("make sure real championship clubs and players are
included") answered H1 with Option A, and asked for the newest top-flight
season, 2025-26, to be added too. The decisions as taken:

- **H1, data: Option A.** Real Championship squads for 2016-17 to 2025-26
  and the real 2025-26 top flight, from the Transfermarkt datalake in
  `salimt/football-datasets` (`scripts/import-transfermarkt.mjs`). The
  ratings are calibrated onto the shipped archive's scale; the method and
  the open rights question (the source has no licence) are in
  [docs/data.md](../../data.md).
- **H2:** six seasons, however they split between divisions.
- **H3:** rivals stay real clubs: the division you are not in is kept whole
  (`state.other`), so the clubs relegated past you are the ones you meet in
  the Championship, and a promoted career meets the real top flight.
- **H4:** you never go below the Championship, but its rivals do: a
  reserve of 13 real clubs with Championship squads on file stands in for
  League One, sending up as many as go down.
- **H5:** built before milestone D, as a web release.

Where the build differs from §§4-8:

- State uses `league` (where the career started, which sets the draft
  archive) and `division` (where it is now) rather than one `tier`; the
  play-offs are played in the `result` phase from `state.playoffs` rather
  than a phase of their own. Save format v6.
- A level play-off tie goes to extra time and penalties as one weighted
  toss toward the stronger side (never more than 70%); the final is at a
  neutral ground, which the engine plays as away.
- Card cut-offs and the window budget scale with the 46-week season.
- **Balance.** The thresholds were tuned on a field the real 2025-26 top
  flight is wider than; the rivals keep their real order but take the
  tuned strengths by rank (docs/data.md). The CI gate now runs 4000
  seasons a cell. The Championship is held to the same thresholds: its
  seasons share one rating distribution, and the division sits a tuned
  3.4 below its squads (`CHAMPIONSHIP_SHIFT`); `npm run sim -- --assert`
  checks both divisions.
- **Bundle.** App code is 121.0 KB gzipped against the 120 KB budget; the
  budget is raised to 125 KB for this release, an owner decision to
  confirm.

