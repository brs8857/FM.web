# Research 3: Competitive landscape and differentiation

| | |
|---|---|
| **Status** | Draft for owner review, 2026-09-25 |
| **Date** | 2026-09-25 |
| **Series** | 3 of 6 |
| **Baseline** | `main` @ `8b3fc57` (v1.1.0) |
| **Feeds into** | [04 UI redesign](2026-09-25-04-ui-redesign.md) (identity, vocabulary), [05 Commercial readiness](2026-09-25-05-commercial-readiness.md) (naming and rights risks) |

For each title: what it does that FM.web doesn't, and what in FM.web reads
as a copy of it. §3 lists every mechanic, name and visual choice that is
too close to an existing title and proposes a replacement. §4 is the
positioning that falls out. None of this is legal advice; §5 lists what a
solicitor should check before a paid release.

---

## 1. The titles

### 1.1 Football Manager (Sports Interactive / SEGA)

**Editions in 2026.** FM26 (PC/console, first release on Unity, with a
tile-and-card UI that was very badly received), FM26 Touch (Apple Arcade
only), FM26 Mobile (Netflix members only, and the only edition not on
Unity). FM24 Mobile was the first Netflix-exclusive; there has been **no
standalone paid Football Manager on the iOS App Store since 2023**. ([SI: FM26 out now](https://www.footballmanager.com/news/football-manager-26-out-now-across-platforms), [FM24 Mobile Netflix FAQ](https://www.footballmanager.com/help/fm24mobile), [FM26 Touch review](https://www.pockettactics.com/football-manager-26-touch/review))

**What FM does that FM.web doesn't.** A full simulated league, a real
transfer market, player development and ageing, a match engine, scouting,
staff, press, and a Fantasy Draft mode (budget draft from a shared pool,
timed picks, designed for multiplayer). ([SI manual: Fantasy Draft](https://community.sports-interactive.com/sigames-manual/football-manager-2024-touch-and-console/fantasy-draft-r4993/))

**What in FM.web reads as FM.** Almost the whole tactical vocabulary and
the name. Detailed in §3. FM's *Fantasy Draft* is also the nearest
existing mechanic to FM.web's core loop, but the two differ in the thing
that matters: FM drafts from one shared pool against a budget; FM.web
drafts one club-season at a time across 33 years with hidden ratings. That
difference should be the headline, and today it isn't.

**Trademark.** "Football Manager", the FM logo, "Sports Interactive" are
registered marks of Sports Interactive Ltd. ([Steam page footer](https://store.steampowered.com/app/3551340/Football_Manager_26/)) FM.web's title tag,
README and package description use "Football Manager" as a descriptive
tagline, and "FM" as the product name. See §3.1.

### 1.2 Out of the Park Baseball 27 / OOTP Go (Out of the Park Developments / Com2uS)

**What it does that FM.web doesn't.** Any historical season as a starting
point, random-debut and fictional leagues, complete statistical history
and hall of fame, and *Perfect Team*, a card-collecting online mode with a
draft variant ("Perfect Draft"). OOTP Go is the mobile edition. ([OOTP 27](https://www.ootpdevelopments.com/out-of-the-park-baseball-home/), [OOTP Go 27 on the App Store](https://apps.apple.com/us/app/ootp-baseball-27-go/id6758360195))

**Copy risk.** Low. Do not adopt Perfect Team's card/pack presentation or
its currency model; both would also collide with the one-time-purchase
plan in 05.

**Worth borrowing (as an idea, not a look).** The historical record as a
first-class screen; "start from any year" as a marketing line.

### 1.3 ZenGM (Basketball GM, Football GM, ZenGM Hockey/Baseball)

**Why it matters.** The closest *architectural* relative: single-player,
entirely client-side JavaScript, IndexedDB saves, free, browser-first.
Real players from 2005 onward, "random debuts" (every real player's debut
year is shuffled, so rosters mix eras), fantasy-draft league starts, and
challenge modes including **no visible ratings**. ([ZenGM league options](https://zengm.com/blog/2020/06/league-creation-options/), [random debuts tag](https://zengm.com/blog/tag/random-debuts/), [technical post](https://zengm.com/blog/2017/04/basketball-gm-4-0-technical-details/))

**What it does that FM.web doesn't.** Full league simulation with every
team's games, history and awards, trades, finances, God Mode, league
export.

**Copy risk.** FM.web's hidden ratings resemble ZenGM's "no visible
ratings" challenge, and era-mixing resembles random debuts. Both are broad
ideas, not protectable expression, and FM.web's version (one club-season
per pick, reveal at kick-off) is its own. No change needed; do not name a
mode "Random Debuts".

### 1.4 EA Sports FC — Ultimate Team "Draft"

**Mechanic.** Choose a formation, a captain from five, then every
position from a random five; balance rating against chemistry; play a
four-match series; rewards scale with wins. ([EA announcement](https://www.easports.com/fifa/ultimate-team/news/2015/fifa-16-fut-draft), [FC 26 guide](https://fifauteam.com/draft-football-club-26/))

**What it does that FM.web doesn't.** A visible trade-off on every pick
(chemistry), short bounded runs, an explicit reward ladder.

**Copy risk.** The word "Draft" is generic. The risk is visual: player
*cards* with a big rating number in the corner and rarity colours read as
Ultimate Team instantly. FM.web's `OvBadge` (a circled number, gold above
85) and the pool of cards are already in that direction. 04 §3 avoids
card-shaped players entirely.

### 1.5 Retro Bowl, Retro Goal, New Star Soccer (New Star Games)

**Why it matters.** The reference for premium-friendly mobile sports
management: sessions of a minute or two, a light management layer between
games, an 8/16-bit identity, and a **free download with a $0.99
"Unlimited Version" non-consumable** (plus ad-free "+" editions on Apple
Arcade). New Star Soccer historically sold career mode as a 69p unlock. ([Retro Bowl Unlimited](https://retro-bowl.fandom.com/wiki/Unlimited_Version), [PocketGamer.biz on New Star Games](https://www.pocketgamer.biz/studio-profile-new-star-games/))

**What it does that FM.web doesn't.** Moment-to-moment play between the
management decisions, and a recognisable art style.

**Copy risk.** None; the retro pixel look is the one visual identity 04
explicitly avoids because it's now New Star's.

### 1.6 Motorsport Manager Mobile (Playsport Games)

Premium mobile management (paid app with optional IAP), season-structured,
strong on "the world changes with you season to season". The relevant
lesson is that a paid mobile management sim with seasons as the unit of
play has a market. ([Playsport](https://www.playsportgames.com/games/motorsport-manager-mobile-2/)) No copy risk.

### 1.7 Free-to-play and browser football managers

Top Eleven (Nordeus), Soccer Manager 2026, Hattrick (since 1997), Trophy
Manager, Soccer Club Management / FCM26, Football Chairman. All are
online, persistent, and monetised through currency, ads or subscription. ([GamingOnPhone list](https://gamingonphone.com/miscellaneous/best-football-management-games-on-mobile/), [On Paper Sports list](https://www.onpapersports.com/blog/best-football-management-games))

**What they do that FM.web doesn't.** Persistent multiplayer worlds, daily
appointment loops.

**Copy risk.** None. They define what FM.web is *not*: no server, no
daily energy, no currency. That is a selling point in the App Store
listing.

### 1.8 Balatro and Slay the Spire (design comparables, not competitors)

Premium ($9.99), run-based, seeded, daily challenges, pausable at any
moment. Balatro passed $21m on mobile by mid-2026; Slay the Spire $13.7m.
They prove the pricing tier and the "one run, put it down anywhere" model
on iOS. ([Pocket Tactics](https://www.pockettactics.com/premium-mobile-games-increase)) FM.web's WheelSpinner and reveal are in this family of
"set up the machine, then watch it go".

---

## 2. Feature comparison

| | FM26 | OOTP 27 | ZenGM | FC Draft | Retro Bowl | FM.web v1.1 |
|---|---|---|---|---|---|---|
| Platform model | PC / Arcade / Netflix | PC + mobile paid | Free web | Inside a F2P game | Free + $0.99 unlock | Free web |
| Run length | Open-ended | Open-ended | Open-ended | 4 matches | Open-ended | 6 seasons, fixed |
| Draft | Budget pool (mode) | Perfect Draft (mode) | Fantasy draft (option) | Pick 1 of 5 | — | Pick from one club-season, median 2–4 options |
| Visible pick constraint | Budget | Card rarity | Cap/ratings | Chemistry | — | None on screen |
| Hidden information | Attributes visible | Visible | Optional "no ratings" | Visible | Visible | OV hidden until kick-off; stats shown |
| Era mixing | No | Yes (historical) | Random debuts | Icons/Heroes | — | Yes, core idea |
| Full league sim | Yes | Yes | Yes | n/a | Yes | No (rival points estimated) |
| Progression between seasons | Yes | Yes | Yes | n/a | Yes | No |
| History / cabinet | Yes | Yes | Yes | Rewards | Yes | No |
| Seeds / dailies | No | No | No | Weekly | No | Seed exists, not exposed |
| Session length | Long | Long | Medium | ~20 min | 1–2 min | 3–5 min draft, 1 min season |
| Offline | Yes | Yes | Yes | No | Yes | Yes |

The empty cells in FM.web's column that no competitor also leaves empty are
*visible pick constraint* and *progression between seasons*. The cell only
FM.web fills is *era mixing as the core idea*. That's the product.

---

## 3. Too close to an existing title — and what to do instead

### 3.1 Name and tagline (must change before any paid release)

| Where | Current | Problem | Proposal |
|---|---|---|---|
| Product name | FM.WEB / `fm-web` | "FM" is how Sports Interactive's game is known; the `.WEB` suffix reads as "Football Manager, web edition" | New name, see below |
| `index.html` `<title>`, `App.jsx` tagline, `README.md`, `package.json` description | "Football Manager, in your browser" | Uses the registered mark as a descriptor of this product | Remove entirely. Describe the genre without the mark: "a football management game" |
| Save envelope `app: "fm-web"`, storage keys `fmweb.*`, CSS `.fmweb-*` | Internal | Harmless, but the export filename `fmweb-season3-….json` and the `#FMweb` share tag are user-visible | Keep the internal `app` id for save compatibility; rename the visible filename, hashtag and CSS prefix with the product |
| "Premier League · 1992 – 2025" header strap, "Premier League" in copy and tier names ("Champions League", "Europa League", "Conference League") | Competition marks used as flavour | The Premier League and UEFA competition names are registered marks. Use as factual description is commonly defended, but as branding it invites a letter | Refer to "the English top flight since 1992"; rename tiers to outcomes ("Champions", "European places", "Top half", "Safe", "Relegated") |

**Working title: "Era XI"** (owner decision, see §6). It names the one
thing this game does that nothing else does, is two syllables, and
doesn't contain "manager", "FM" or a competition name. Alternatives to
check at the same time: "Any Era XI", "Eleven Eras", "Dugout Archive".
Before adopting any of them: UK IPO and EUIPO trade-mark search in class
9 and 41, App Store name availability, and a domain.

### 3.2 Tactics vocabulary

FM's tactical model is expressed through a specific taxonomy. FM.web
reproduces it closely enough that a reviewer would call it a clone even
though the engine underneath (`engine/tactics.js`) is original:

| FM.web element | File | Why it reads as FM | Replacement |
|---|---|---|---|
| Role + Duty (Defend / Support / Attack) as the per-player unit | `engine/roles.js` `DUTY_INFO` | The role/duty pair is FM's signature player-instruction model | Keep the *mechanics* (two multipliers), rename the concept: **Job** + **Brief** (Hold / Link / Push). The keys `Defend/Support/Attack` stay in saved state; labels change |
| Role names: Ball-Playing Defender, No-Nonsense Centre-Back, Complete Wing-Back, Inverted Full-Back, Anchor Man, Deep-Lying Playmaker, Ball-Winning Midfielder, Roaming Playmaker, Box-to-Box, Advanced Playmaker, Shadow Striker, Wide Playmaker, Pressing Forward, Deep-Lying Forward, Complete Forward, Sweeper Keeper | `engine/roles.js` `ROLES` | This is FM's role list almost verbatim | Rename with plain-football descriptions that describe what the multipliers do. Generic football terms (Mezzala, Enganche, False 9, Target Man, Poacher, Winger, Inverted Winger, Full-Back, Wing-Back, Stopper, Cover) can stay; those are common vocabulary. Full list in 04 Appendix A |
| Mentality ladder: Very Defensive / Defensive / Cautious / Balanced / Positive / Attacking / Very Attacking | `engine/readout.js` `mentalityLabel` | FM's exact seven labels | Five labels with different words: Contain / Careful / Even / Front-foot / All-out |
| "Tactical Familiarity" with Masterclass/Drilled/Solid/Shaky/Unfamiliar | `engine/familiarity.js` | "Tactical familiarity" is FM's term | **Cohesion** with labels Clicking / Settled / Rough / Strangers |
| Team shape Structured / Fluid | `engine/instructions.js` | FM17-era "team shape" | **Discipline**: Rigid / Loose |
| Style presets "Gegenpress", "Possession Control", "Park The Bus", "Wing Play", "Direct & Vertical", "Low Block Counter" | `engine/instructions.js` `STYLE_PRESETS` | FM ships named preset styles including Gegenpress and Tiki-taka | The football terms are generic. Keep, but present them as *identities the engine detects* (which is what `identitySynergy` does) rather than a preset picker that mirrors FM's |
| Slider labels "Tempo", "Directness", "Width", "Pressing Intensity", "Defensive Line", "Tackling Intensity" | `InstructionsPanel.jsx` | Standard football English; also FM's | Keep. Common vocabulary |
| "Reveal Ratings & Simulate", "Kick Off" | UI | Fine | Keep |

Renaming labels does not require a save migration because saves store role
`key`s (`BPD`, `DLP`…) and duty strings, not labels. The keys stay.

### 3.3 Visual and interaction choices

| Element | Reads as | Proposal |
|---|---|---|
| Player pool as rating-badge cards (`PlayerMiniCard`, `OvBadge` gold ≥ 85) | EA FC Ultimate Team | No card metaphor. Players are rows on a **team sheet**; the reveal shows the number the way a printed programme would, not as a gem-coloured badge (04 §3) |
| Dark green-black gradient, emerald buttons, condensed uppercase labels with letter-spacing | Generic "football app dark mode", and FM's older green skin | New identity in 04 §3: back-page newsprint and chalkboard |
| "Spin the wheel" | Slot-machine framing (also an App Store age-rating question: "gambling and contests") | **Draw** a club-season from the archive: a ticker/teleprinter that settles, not a wheel (04 §5.2) |
| Radar chart for the six team ratings | FM and most sports games | Keep the data, change the form: six horizontal **strength bars** with the opponent-average marked, which also reads better at phone width and for screen readers |

### 3.4 Things that are fine

Formation names, slot codes (GK/CB/…), instruction sliders, the pitch
itself, "Transfer window", league tables. All common football language.

---

## 4. Positioning

**One line:** *Draft an XI from 33 years of the English top flight, one
club-season at a time, ratings hidden until kick-off, then find out what
you built.*

**Three claims the listing can make that no competitor above can:**

1. Every pick is a memory test: you draft Arsenal 1997-98 or Leeds 2000-01, not "a centre-back".
2. You don't see the numbers until the whistle goes.
3. A whole season in a minute; a career on the bus.

**Three things it is not** (say them, because the market assumes them):
no server, no energy, no cards or packs.

---

## 5. Rights review (owner action before release)

Not legal advice; a checklist for a solicitor.

1. **Product name** clear of Sports Interactive / SEGA marks and of any football-manager-adjacent marks in the UK, EU and US (class 9, 41).
2. **"Premier League"** and UEFA competition names removed from product copy; factual references ("English top flight") only.
3. **Club names.** The Manchester United v SEGA/SI case (settled 2021; SI renamed the club "Man UFC" as a goodwill gesture while maintaining no licence was needed) shows the exposure is real even when the legal position is arguable. Options: keep real names (FM's position), or ship an editor/toggle for club names so a takedown is a data change, not a rebuild. Default: keep names, ship the toggle. ([Sky Sports](https://www.skysports.com/football/news/11667/12374507/manchester-united-to-be-renamed-on-football-manager-following-trademark-settlement), [LawInSport](https://www.lawinsport.com/topics/item/sega-s-battle-against-man-utd-in-football-manager-trade-mark-case-ends-in-settlement))
4. **Player names.** Names and factual career data, no likenesses or photos. Same footing as FM and ZenGM. Confirm for the UK and for US right-of-publicity.
5. **Dataset provenance.** Club IDs in `players.json` match Transfermarkt's; ratings are derived from market values (README §"Notes on the data"). Transfermarkt's terms govern reuse of its data; the shipped file contains derived numbers, not raw values, but the IDs and the derivation chain should be reviewed, the IDs replaced with the project's own slugs (a data-file change), and the derivation documented as a transformation. Also confirm what `build_final.py` (missing, code review §1) pulled.
6. **Fonts.** Any typeface bundled in the app needs a licence permitting app embedding (Google Fonts' OFL fonts do).

---

## 6. Owner decisions

| # | Decision | Recommended default | Reversible? |
|---|---|---|---|
| C1 | New product name | "Era XI" pending trade-mark and App Store checks | Yes until the App Store listing is created |
| C2 | Rename the tactics vocabulary as in §3.2 | Yes, in the redesign release | Yes (labels only) |
| C3 | Club-name toggle / editor | Ship real names with a data-level rename path | Yes |
| C4 | Replace Transfermarkt club IDs with own slugs | Yes, in the same data change | Yes |
