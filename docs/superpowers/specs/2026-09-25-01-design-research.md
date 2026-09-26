# Research 1: Design theory for a draft-and-career football sim

| | |
|---|---|
| **Status** | Draft for owner review, 2026-09-25 |
| **Date** | 2026-09-25 |
| **Series** | 1 of 6 — see [00 index in roadmap](../../roadmap.md#redesign-and-commercial-release-series) |
| **Baseline** | `main` @ `8b3fc57` (v1.1.0) |
| **Feeds into** | [02 Gap analysis](2026-09-25-02-gap-analysis.md), [04 UI redesign](2026-09-25-04-ui-redesign.md) |

This document collects the design theory that applies to FM.web's genre: a
management/career sim built around a roster draft. It is deliberately
source-led. Each section ends with a short list of **design tests** that the
gap analysis (02) applies to the current code and the redesign (04) has to
satisfy.

---

## 1. What kind of game this is

FM.web is not a pure management sim. Its loop is:

1. **Draft** an XI, one club-season at a time, with ratings hidden.
2. **Build** a tactical system from roles, duties, positioning and instructions.
3. **Reveal** the ratings, then **play** a season in one sitting.
4. **Repeat** for up to six seasons with a small transfer window between them.

That is closer to a run-based draft game (a deck-builder run, a fantasy
draft, an EA FC "Draft" series) than to Football Manager's open-ended
career. The theory below is therefore drawn from three places: management
sims, run-based draft games, and mobile session design.

---

## 2. Agency versus simulation depth

**Sid Meier, "Interesting Decisions" (GDC 2012).** A game is a series of
interesting decisions; a decision is interesting when it involves a
trade-off, depends on the situation, expresses the player's style, and has
consequences that persist. Meier's negative test is just as useful: if the
player always picks the first option, or picks at random, the decision
isn't interesting. ([gamedeveloper.com summary](https://www.gamedeveloper.com/design/gdc-2012-sid-meier-on-how-to-see-games-as-sets-of-interesting-decisions), [GDC Vault](https://gdcvault.com/play/1015756/Interesting))

**Ryan, Rigby & Przybylski, "The Motivational Pull of Video Games" (2006)**
and the PENS model. Enjoyment and intent to keep playing are predicted by
satisfaction of three needs: **competence** (clear, consistent feedback on
whether you did well and why), **autonomy** (real choice of goals and
strategies), and **relatedness**. Intuitive controls feed both competence
and autonomy. ([paper](https://selfdeterminationtheory.org/SDT/documents/2006_RyanRigbyPrzybylski_MandE.pdf), [PENS](https://selfdeterminationtheory.org/player-experience-of-needs-satisfaction-pens/))

**Balatro (LocalThunk).** The score preview is hidden on purpose: "the game
is more fun when you set up your Rube Goldberg machine and watch it go
before knowing whether or not the hand will win." Depth is delivered as a
*visible chain of consequences*, not as a bigger spreadsheet. There are no
timers; the player controls pace entirely. ([Rogueliker interview](https://rogueliker.com/balatro-interview/), [GMTK on Balatro's design](https://gmtk.substack.com/p/balatros-cursed-design-problem))

The management-sim lesson that follows from these three is that simulation
depth only counts as agency when the player can (a) see the levers, (b)
predict roughly what a lever does, and (c) read back afterwards *which*
lever mattered. Depth the player can't attribute is noise.

**Design tests**
- D1. Every choice offered has at least two live options that a reasonable player might pick (Meier's "not the first option" test).
- D2. The player can predict the direction of a change before committing, and can see afterwards which change mattered (PENS competence).
- D3. Hidden information is hidden for suspense, and revealed at a moment the player is looking forward to (Balatro).
- D4. No timers or forced pacing in decision screens.

---

## 3. Loops, arcs and the reward structure

**Daniel Cook, "Loops and Arcs" (Lostgarden, 2012).** Loops repeat and
build mastery; arcs run once and deliver story. Games are fractal: a small
loop (one pick) sits inside a medium loop (one season) inside a large loop
or arc (a career). Cook's warning is that arc-heavy games *deplete* — once
the story has been consumed there's nothing left — while loop-heavy games
sustain, provided each loop returns something the player carries forward.
([lostgarden.com](https://lostgarden.com/2012/04/30/loops-and-arcs/))

**Slay the Spire (Mega Crit, GDC 2019 "Metrics Driven Design and
Balance").** Meta-progression is deliberately tutorial-shaped: each
character starts with a good selection, more cards and relics unlock
quickly from early runs, and 20 Ascension levels re-use the same loop with
cumulative constraints. Balance was driven by an always-on telemetry loop
of pick rates and win rates. ([GDC Vault](https://www.gdcvault.com/play/1025731/-Slay-the-Spire-Metrics))

**Hades (Supergiant).** Failure delivers two signals: you made an error,
and you still made progress. Meta-progression reframes the punishment loop.
([Tom's Guide interview](https://www.tomsguide.com/uk/features/hades-exclusive-interview-supergiant))

**Mark Rosewater, "Twenty Years, Twenty Lessons" (GDC 2016).** The lessons
most relevant here: *restrictions breed creativity* (a constrained pool
produces more interesting builds than a free one); *fighting human nature
is a losing battle* (if the optimal play is boring, players will play it and
then quit); *if everyone likes your game but no one loves it, it will
fail* (a game needs a signature that some players adore). ([Making Magic part 1](https://magic.wizards.com/en/news/making-magic/twenty-years-twenty-lessons-part-1-2016-05-30), [part 2](https://magic.wizards.com/en/news/making-magic/twenty-years-twenty-lessons-part-2-2016-06-06), [part 3](https://magic.wizards.com/en/news/making-magic/twenty-years-twenty-lessons-part-3-2016-06-13))

**Design tests**
- L1. Each loop level (pick, season, career) returns something the player keeps: information, a record, an unlock, a story beat.
- L2. The career has an ending that is a payoff, not a wall, and starting again is framed as "new run", with something carried across runs.
- L3. The optimal strategy is not the boring strategy (Rosewater). Balance is measured, not guessed.
- L4. The game has one signature moment players describe to friends.

---

## 4. Session length and pacing on mobile

**Retro Bowl (New Star Games).** The most successful premium-friendly sports
management title on mobile in recent years fits into sessions of a minute
or two while still "scratching the build-a-dynasty itch". Its designer
Simon Read's studio is described as prioritising pick-up-and-play
accessibility with the long-term engagement of a career sim. ([Pocket Gamer](https://pocketgamer.com/articles/087746/app-army-assemble-retro-goal-does-new-star-games-latest-effort-hit-the-back-of-the-net), [Crossplay](https://www.crossplay.news/p/retro-bowl-25-is-the-ultimate-dad-game))

**Football Manager Touch / Mobile.** Sports Interactive splits the franchise
into a full PC game, a "Touch" edition with streamlined features, and a
"Mobile" edition rebuilt around shorter sessions. FM26 Touch's Apple Arcade
launch was criticised specifically for UI issues on iPhone ("difficult to
play", "countless UI issues"), which is a reminder that a desktop
information architecture does not shrink onto a phone. ([Pocket Tactics review](https://www.pockettactics.com/football-manager-26-touch/review), [SI bug tracker thread](https://community.sports-interactive.com/bugtracker/1644_football-manager-26-bugs-tracker/user-interface/2168_portal-messages-user-interface-issues/the-ui-on-fm-26-touch-is-awful-especially-on-the-iphone-r41090/))

**Balatro on mobile** succeeded as a $9.99 premium title (over $21m mobile
revenue by mid-2026, per Pocket Tactics/Statista) with the same rule: any
run can be put down and picked up at any point with no penalty. ([Pocket Tactics](https://www.pockettactics.com/premium-mobile-games-increase))

The pattern across these is a **natural stopping point every 2–5
minutes**, autosave at every one of them, and a clear "what's next" card
when the player comes back.

**Design tests**
- S1. There is a natural stopping point at least every 5 minutes, and the app autosaves there.
- S2. Coming back shows, in one screen, where you are and the single next action.
- S3. Nothing in the loop requires a continuous session longer than a phone user would give it (roughly the length of a bus stop).
- S4. The most repeated interaction is one-thumb, one-tap.

---

## 5. Onboarding for systems-heavy games

**Crusader Kings III (Paradox, Dev Diary #16).** Every important term is
highlighted and opens a definition, and definitions can be nested. The
system removed the need for a long tutorial by making the game
self-explaining at the point of confusion. ([Dev Diary #16](https://store.steampowered.com/news/app/1158310/view/1719750490053071870), [GameWatcher](https://www.gamewatcher.com/news/crusader-kings-3-tutorials-highlighted-text-encyclopedia))

**Slay the Spire's unlock curve** (section 3) doubles as onboarding: the
initial option space is small on purpose.

**Football Manager 26's tile-and-card UI** is the counter-example. It was
"built to simplify things for newcomers" and produced one of the most
negatively reviewed launches on Steam, with reviewers citing missing back
buttons, truncated text and a "maze of screens". Simplifying the *look* of
a complex system without simplifying the *number of things on screen*
doesn't onboard anyone. ([Thick Accent](https://www.thickaccent.com/2025/10/24/maze-of-screens-fm26-beta-sparks-backlash-over-controversial-new-ui/), [Galaxus](https://www.galaxus.at/en/page/football-manager-26-is-floundering-in-an-interface-labyrinth-40507))

**Design tests**
- O1. A first-time player can complete a draft, set a tactic and finish a season without reading any paragraph of instructions.
- O2. Every game term is explained at the point it appears, on tap (not hover), with nested explanations where needed.
- O3. Advanced controls are progressively disclosed; the default screen shows the few levers that matter most.
- O4. The player is never more than one tap from "what should I do now?".

---

## 6. What makes drafting satisfying

**Fantasy sports.** Ownership is the engine: the endowment effect makes
players value what they drafted above equivalent alternatives, which is
why draft day is the emotional peak of a fantasy season and why people
stick with their picks (Hobbs 2022 on draft-pick trading; AFL study on
compounding endowment). Drafts are also *knowledge tests*: the pleasure
comes from knowing something about a player that the list doesn't show. ([Hobbs, Economic Inquiry 2022](https://onlinelibrary.wiley.com/doi/full/10.1111/ecin.13102), [AFL study](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10939225/), [Fantasy Football Scout](https://www.fantasyfootballscout.co.uk/2016/05/26/the-psychology-of-fantasy-football/))

**EA FC "Draft".** Pick from **five** per position, then the tension is
explicit: best rating versus team chemistry. A four-match series makes the
run short, and rewards scale with wins. ([EA FUT Draft announcement](https://www.easports.com/fifa/ultimate-team/news/2015/fifa-16-fut-draft), [FC 26 draft guide](https://fifauteam.com/draft-football-club-26/))

**Slay the Spire.** Pick one of **three**, or **skip**. Skipping is a
first-class decision because a deck can be hurt by a card. Mid-run, the
player is building towards a synergy they can *see forming*. ([StS wiki](https://slay-the-spire.fandom.com/wiki/Card_Rewards))

**Magic: The Gathering draft (Rosewater).** Good draft formats are
"lenticular": simple for new players (take the strong card) but rich for
experienced ones (read signals, commit to an archetype at the right time).
Restrictions — a fixed pack, limited picks — are what make the choices
interesting.

**Football Manager's own Fantasy Draft** (FM2016 onward) is a budget draft
from a shared pool with a per-pick timer, designed for multiplayer. Its
tension is *money*: all managers start with the same budget. ([SI manual](https://community.sports-interactive.com/sigames-manual/football-manager-2024-touch-and-console/fantasy-draft-r4993/))

Across these, a satisfying draft pick has:

1. **A real choice** — three to five options, not one or two.
2. **Visible tension** — a constraint (budget, chemistry, curve, era spread) the pick trades against.
3. **A forming plan** — the player can see the squad's identity taking shape as they pick.
4. **A skip or hedge** — a way to decline a bad pool at a cost.
5. **A payoff reveal** — the moment the drafted thing is finally evaluated.

**Design tests**
- R1. A pick offers at least three options at least 80% of the time (FUT: five, StS: three).
- R2. The constraint the pick trades against is visible on the pick screen.
- R3. The squad's emerging identity is visible during the draft, not only at the end.
- R4. There is a skip/re-draw with a cost.
- R5. The reveal is staged as the run's payoff (FM.web's ratings reveal already does this; keep it).

---

## 7. Replayability

- **Seeded runs and dailies.** Spelunky's daily challenge (2013), Slay the Spire's Daily Climb, Balatro's seeded runs and dailies. The mechanic costs almost nothing once randomness is seeded (FM.web has `careerSeed` already) and it creates relatedness without a backend: everyone drafting the same club-seasons today can compare on a shared screenshot.
- **Challenge modifiers.** ZenGM's league creation offers "no draft picks / no free agents / no trades / **no visible ratings**" challenge modes; Slay the Spire's Ascension. Both re-use the whole game at near-zero content cost. ([ZenGM blog](https://zengm.com/blog/2020/06/league-creation-options/))
- **Era and pool restrictions** (Rosewater's restrictions). FM.web's era slider is this already.
- **A record.** OOTP and ZenGM keep full history, awards and hall of fame; the record is what makes the next run mean something.

**Design tests**
- P1. Two players can play "the same" run and compare.
- P2. At least three modifiers change the strategy, not just the difficulty.
- P3. The game keeps a record across runs.

---

## 8. Reward loops without dark patterns

This is a one-time-purchase product (see [05](2026-09-25-05-commercial-readiness.md)). That removes the usual pressure for streaks, timers and appointment mechanics. The relevant guidance is Apple's own: no manipulative or misleading patterns, and (under guideline 5.1.1(ii)) any usage-data collection needs explicit consent even when anonymous. The reward loop should therefore be **intrinsic**: a record, a reveal, a shareable card, a harder modifier — and never a countdown.

**Design tests**
- E1. No timers, streaks, energy or appointment mechanics.
- E2. Rewards are records, reveals and options, not currency.

---

## 9. Summary table of design tests

| Area | Tests | Applied in |
|---|---|---|
| Agency | D1–D4 | 02 §3, 04 §5 |
| Loops | L1–L4 | 02 §4, 04 §4 |
| Sessions | S1–S4 | 02 §5, 04 §6 |
| Onboarding | O1–O4 | 02 §6, 04 §7 |
| Draft | R1–R5 | 02 §3, 04 §5.2 |
| Replayability | P1–P3 | 02 §4, 06 §4 |
| Ethics | E1–E2 | 05 §6, 06 §2 |

## 10. Sources not linked above

- Csikszentmihalyi's flow model and Jenova Chen's "Flow in Games" underpin S1–S3 (difficulty adapts, session is interruptible).
- Martin Jonasson & Petri Purho, "Juice it or lose it" (2012), underpins the reveal and result staging in 04.
