# Era XI — AI-tells audit (2026-09-26)

Baseline: `claude/zen-feynman-hler0e` @ `4d4a4d9` (v2.7.0). Every line of
the game was written by AI agents in separate sessions. This is the list of
signs checked for, then what was found and changed, group by group. The
target is the voice and identity in
[spec 04](superpowers/specs/2026-09-25-04-ui-redesign.md) ("back page and
chalkboard"), not neutral blandness.

## 1. Checklist

Sources: Wikipedia's *Signs of AI writing* field guide
([WP:AISIGNS](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing)),
which the `humanizer` skill is built on; for UI, the recurring lists in
[Why every AI-built website looks the same (dev.to)](https://dev.to/alanwest/why-every-ai-built-website-looks-the-same-blame-tailwinds-indigo-500-3h2p),
[AI design slop: 16 patterns (Developers Digest)](https://www.developersdigest.tech/blog/ai-design-slop-and-how-to-spot-it)
and [How to spot a vibe-coded website (Sinton)](https://www.sinton.agency/blog/how-to-spot-a-vibe-coded-website);
for code, [Investigating the smells of LLM generated code (arXiv 2510.03029)](https://arxiv.org/html/2510.03029).
The web pages were found by search; the proxy blocked fetching them, so
only their search summaries were read. Colour provenance:
[Flat UI Emerald #2ECC71](https://materialui.co/flatuicolors/emerald),
[Apple HIG colour](https://developer.apple.com/design/human-interface-guidelines/color)
(systemGreen #34C759 light, #30D158 dark).

### Code
- C1 Comments that say *what* the next line does. The repo rule is no comment unless the *why* is non-obvious.
- C2 Leftover scaffolding: dead code, unused exports/imports, TODO/FIXME, `console.*`, commented-out code.
- C3 Defensive code for cases that can't happen (`?.` / `?? []` on values the reducer always sets, try/catch around pure code).
- C4 Generic names (`data`, `item`, `handleClick`, `result`) where a domain name exists.
- C5 Drift between files that should match (props, file layout, CSS naming, test style), the mark of separate agent passes.
- C6 Copy-pasted near-duplicates and single-use wrappers (known: the 0.82/0.18 opponent blend in `Board/Strengths.jsx` and `engine/match.js`).
- C7 Unexplained magic numbers where the codebase names the same number elsewhere.

### Copy
- W1 Marketing voice: seamless, powerful, elevate, unlock, dive in, robust, leverage, journey, experience.
- W2 Em-dash overuse; rule-of-three padding; "not just X, it's Y"; hedging ("may", "can help").
- W3 Bold inline header on every list item; title-case headings.
- W4 Onboarding, empty-state and error copy that could belong to any app.
- W5 Tone drift between screens (terse here, chatty there); jargon from software rather than football.
- W6 Spec 04 §11: British English, sentence case, short, no exclamation marks.

### Visual
- V1 Stock palettes: Tailwind defaults, Flat UI, iOS system colours, AI purple, neon on dark, gradients, glassmorphism.
- V2 Default font picks: Inter, Geist, Poppins, Montserrat, Space Grotesk, DM Sans, Plus Jakarta Sans; JetBrains Mono / IBM Plex Mono as the "techy" accent; Oswald / Bebas Neue / Barlow Condensed as the "sports" headline face.
- V3 Shapes: pills everywhere, one radius on everything, soft shadows, card in card, uppercase letter-spaced kickers, icon + title + blurb triads, stat tiles, uniform spacing.
- V4 Motion: fade/slide-in on everything, stock easing.
- V5 Icons: generic line-icon sets, sparkles/stars as "magic", emoji as furniture.

### Product
- P1 Settings or UI that do nothing for the player.
- P2 Placeholder-feeling content (lorem, "Coming soon", generic sample names).
- P3 Dead ends: screens with no way on or back.

## 2. Findings and changes

### 2.1 Code hygiene (C1–C3)

Found:
- **What-comments everywhere (C1).** Nearly every component opened with a
  docblock listing what it renders ("The Squad tab (spec 04 §5.3): pinned
  board, team sheet, player sheets."), the pattern of one agent pass per
  file. The engine's comments were in a sales voice: "genuinely" eight
  times, "meaningfully", "a big, visible lever", "masterfully drilled",
  "there's no scripted script to any of it", `--- Section ---` and
  `/* ==== */` banners. One was stale: `tactics.js` still described the
  profile as feeding "the radar chart", which 2.0.0 replaced with bars.
- **Dead code (C2).** `SLOT_TYPE_LABEL` in `engine/formations.js` (the v1
  labels, "Full-Back / Wing-Back", only a test read it);
  `selectLegacyWheel` in `state/selectors.js` (kept "until B11 retires
  it"; B11 shipped in 2.0.0); `splitTopLevel` in `content/t.js`, exported
  as `_splitTopLevel` and never called; `PauseIcon` and `PlayIcon`; four
  string keys nobody reads (`shell.preview` "redesign preview",
  `draft.progress`, `squad.eras`, `season.unbeaten`); two term sheets
  nothing opens (`blank-slate`, `stat-bands`); `scripts/extract-data.mjs`,
  a one-off that edits `src/App.jsx`, which no longer exists.
- No TODO/FIXME or commented-out code. The only `console` call in `src` is
  the crash log in `ErrorBoundary`, which is deliberate.
- A flaky gate: `tests/unit/axe-screens.test.jsx` runs axe several times
  per case and timed out at vitest's 5 s default when the whole suite ran,
  then failed the next case with "Axe is already running".

Changed (commit below):
- Removed about 110 what-comments across 60 files in `src/app`, `src/ui`,
  `src/screens`, `src/content`, `src/state`, `src/engine` and the CSS;
  where a comment carried a reason, it was cut down to the reason (why a
  prop exists, why a catch is empty, why a key remounts, why compression
  runs once). The engine edits are comment-only: `npm test`'s golden
  profile and season checks pass unchanged.
- Deleted the dead code above; `basics.test.js` now checks slot types
  against the live `POSITION_LABEL`. De-exported `isStandalone` and
  `LOCALE`, which only their own files use.
- Gave the axe suite a 30 s timeout.

Left alone: `src/pitch/**` (the orchestrator is changing the chalkboard
layout there). `src/screens/Draft/Draw.jsx`, `Draft.jsx` and
`src/app/FirstRun.jsx`, changed on `claude/zen-feynman-hler0e`, were done
after merging it. Engine constants exported only for their own file
(`HOME_ADVANTAGE`, `STOPPAGE_CHANCE`, …) stay exported: they are the
tunables `sim.mjs` users look for.

### 2.2 Code conventions (C4–C7)

Found:
- **The Strengths blend (C6)** named in the brief was already fixed at
  `4d4a4d9`: `Board/Strengths.jsx` imports `rivalStrength` from
  `engine/match.js`, and no other copy of 0.82/0.18 exists.
- **A second copy of the neutrality test (C6, C7).** `engine/readout.js`
  recomputed `dialExtremity` inline and compared it with a bare `0.16`,
  the value `tactics.js` names `NEUTRAL_EXTREMITY`. `content/labels.js`
  had a third route to the same answer (`identityLabel(synergyLabel,
  instructions)`), and `MatchReport.jsx` a fourth (`identityName`).
- **Two `signed()` functions that disagree (C5).** `MatchReport.jsx` wrote
  a true minus (−3, ±0); `ConfirmPick.jsx` wrote a hyphen (-3), so the
  confirm sheet said "cohesion -2" while the strip said "cohesion −2".
- **Formatters living in screens (C5).** `ordinal` was defined in
  `Season/Vidiprinter.jsx` and imported by five other screens;
  `playerMeta` lived in `Draft/CuttingSheet.jsx` and was imported by the
  Squad and Season screens; the W/D/L tone map was pasted into three
  files; `Vidiprinter.jsx` re-exported the engine's `HALF_SEASON`.
  `ConfirmPick.jsx` rebuilt `SIDE_LABEL` inline.
- **Pass-through wrappers (C6).** `selectFamiliarity` and `selectProfile`
  in `state/selectors.js` only renamed `computeFamiliarity` and
  `computeTeamProfile`.
- **CSS drift (C5).** The mono uppercase `.kicker` is pasted into six
  modules, `.subheading` into five, `.rows` into four, `.hint` twice at
  two sizes. Left for the typography and UI-pattern passes, which restyle
  them.

Changed (commit below):
- New `src/content/format.js` holds `ordinal`, `signed` (true minus),
  `playerMeta`, `SIDE_LABEL` and `RESULT_TONE`; eleven screens import
  from it instead of from each other.
- `readout.js` calls `dialExtremity(instructions) < NEUTRAL_EXTREMITY`
  (same dials, same order, so the golden readouts are unchanged);
  `identityLabel(instructions)` is now `identityName(identityKey(...))`,
  and `identityName` lives in `labels.js`.
- `selectFamiliarity`/`selectProfile` removed; `App.jsx` calls the engine.

Logged, not changed:
- `ClubTab` rebuilds `clubName` from `prefs` while every other tab gets it
  from `App`; harmless, and changing it means reworking the Club tests.
- The record stores `profile.synergyLabel`, which is null for both "no
  plan" and a bespoke system, and `Record.jsx` shows every null as
  "Bespoke". Telling them apart needs the identity key in
  `seasonHistory`, a save-format change.
- `seasonKey` is parsed to a year in three places (`engine/identity.js`,
  `engine/familiarity.js` with a defensive `"2010_0"` default, and
  `state/selectors.js`). Unifying touches the engine.

### 2.3 Copy (W1–W6)

The voice to hit is spec 04's: a back page and a chalkboard, British
English, sentence case, short, no exclamation marks. Most of the screen
copy already had it ("Comfortable and safe, and forgotten by August",
"hung up the boots", "Hidden through the draft and the board. This is
what you built."). The tells were concentrated in a few places.

Found and changed:
- **Job descriptions** (`engine/roles.js`, shown on every player sheet):
  33 pundit blurbs built on em dashes, name-drops and hype ("the
  Pirlo/Busquets archetype", "a Guardiola-era staple", "the engine room
  enforcer", "a relentless every-blade-of-grass outlet", "No weaknesses in
  his game"). Rewritten as one plain line each, in the voice of a
  programme's player notes ("Heads it, blocks it, clears it. No interest
  in playing out from the back.", "Chalk on his boots: pace in behind and
  crosses from the byline."). The three brief descriptions likewise.
  Copy only; the weights beside them are untouched.
- **Style preset descriptions** (`engine/instructions.js`): seven long
  blurbs ("Klopp-school counter-pressing…") that no screen shows. Removed.
- **Software voice in the coach's notes and term sheets**: "what the
  engine sees in your dials", "runs a batch", "the style the engine
  recognises", "a bonus in the simulation", plus "devastating" and
  "high-risk, high-reward". Rewritten to talk about the side, not the sim.
- **A headline contradicted by its standfirst**: 8th place is headlined
  "Just outside Europe" but the standfirst said "Just enough for a
  European place". Now "Eighth: one place short of Europe, and a summer to
  wonder where the points went." "Relegated" now admits the XI stays up
  ("Bottom three. Any other club would be going down; this XI gets
  another go."); two standfirsts lost their press-release tone.
- **Design-doc language on screen**: the half-season slip said "A stopping
  point." (the spec's term); now "Halfway. Look over the board, or carry
  on." Pre-season said "at kick-off" twice in two sentences; merged.
- **Generic app copy**: the crash screen was "Something went wrong" /
  "Start new game"; now "Match abandoned" / "Start a new career" (the
  game says career everywhere else). The loading screen said "Loading
  player data…" / "Couldn't load player data" / "Retry"; now "Opening the
  archive…" / "The archive didn't load" / "Try again".
- **A dead end**: About told players to "see the project's data notes",
  which they can't open. It now says what the ratings are made from.
- **Registry names**: the archive stores "Arsenal FC", "AFC Bournemouth",
  "Sunderland AFC" and "Wimbledon FC (- 2004)", and the game printed them
  as-is, including in the colour picker. `clubName()` now prints them as
  a back page would ("Arsenal 2003-04", "Wimbledon"); saves and keys keep
  the stored names. The draw's ticker printed the index's stored labels,
  so it also ignored the edited-names setting; it now uses the same label
  as the cuttings.
- **Punctuation**: scores used a spaced em dash ("Your XI 0 — 2 AFC
  Bournemouth"); now an en dash, as printed results are ("Your XI 0–2
  Bournemouth"). Goal difference printed a hyphen for minus; it now uses
  the true minus the rest of the game uses. The share caption's em dash
  became a colon.
- **Store copy**: `package.json`'s description (em dash, three-part list)
  and `index.html`'s meta description shortened; README says saves happen
  after every match, and "engineered from" became "worked out from".
- **Settings**: "every layout is tested at 200%" was a QA claim, not a
  setting; cut. See 2.3.1 for the Haptics toggle.

#### 2.3.1 Product (P1–P3)
- **Haptics toggle** (P1): stored a preference nothing reads; the web app
  has no haptics and the native build doesn't exist yet. Removed from
  Settings; the `haptics` key stays in `prefs.js`, so it can come back
  with the Capacitor build without a migration.
- `tierLabel()` passed through the engine's Tailwind colour names
  (`amber`, `emerald`, `sky`, `violet`, `slate`, `rose`), which nothing has
  drawn since Tailwind was removed in 2.0.0. Dropped from the content
  layer.

Logged for the owner, not changed:
- **The Board readout** (`engine/readout.js`) is the most AI-sounding
  copy left: "genuine bonus", "devastating when the trigger is right",
  "a genuine edge", "properly gung-ho", "can genuinely overwhelm",
  "a solid platform to build from", an em dash in 14 of its 18 notes. Its
  strings are pinned by `tests/golden/profiles.json`, so changing them
  means re-recording that file (spec 04 §9 allows it, in its own commit).
  A replacement set, ready to paste:
  - `${label}, ${strength}. Drilled well, it's worth extra on match day.` with strength "drilled" / "taking shape" / "not drilled in yet"
  - "No plan: every dial is close to neutral, and a side with no plan gets picked apart. Commit to something, even something odd."
  - "A high press with a high line. It wins the ball up the pitch, and leaves space in behind when it doesn't."
  - "A mid-to-low block that gives up ground on purpose: hard to play through, but you'll be without the ball for long spells."
  - "The offside trap with a high line behind it. It catches forwards until one step is mistimed."
  - "The offside trap is on, but the line is too deep to catch anyone."
  - "All-out, with little left at the back: expect end-to-end games, not clean sheets."
  - "Set up to contain. You'll grind out results, and struggle against a side that sits in."
  - "Built to counter: let them have it, then break quickly. You won't control many games."
  - "Early crosses from wide and deep. Worth it with a big man and runners arriving late."
  - "Told to cross, but set up narrow: nobody is out wide to cross from."
  - "Quick, short passing. Hard work, and too quick for a settled defence when it comes off."
  - "Direct passing skips the midfield and gains ground fast, at the cost of the ball."
  - "Real width stretches their back four and can leave gaps in your own middle."
  - "Narrow and compact: good for combinations inside, but the channels go unused."
  - "They don't know this system yet. Expect streaky results while it beds in."
  - "Drilled. They could play this in their sleep, week in, week out."
  - "Nothing extreme and nothing out of place. Unspectacular, but sound."
- **One club under two names** (a data bug found on the way): the
  archive calls five clubs "Burnley FC", "Southampton FC", "Watford FC",
  "Portsmouth FC" and "Middlesbrough FC", while the promotion pool
  (`src/data/championship.json`) calls them "Burnley", "Southampton", and
  so on. Promotion excludes clubs by exact name, so "Burnley" can be
  promoted into a league that still has "Burnley FC" in it. Now that both
  print as "Burnley", that would show. Fixing it touches the data and the
  golden league file.
- The engine's own tier `sub` strings (em dashes, "a genuinely solid
  campaign") are never displayed (the back page reads `TIER_STANDFIRST`)
  but are pinned by `engine/season.test.js` and the golden seasons.
- `Saves.jsx` names its handler `handleFile`; left alone because the brief
  keeps the import flow off limits except for copy.

### 2.4 Palette (V1)

Found:
- The default "Pitch" theme's attention colour was Flat UI's Emerald
  (`#2ECC71`) in light and Apple's `systemGreen` (`#34C759`) in dark, with
  emerald-leaning buttons (`#0F5C34`, `#22A155`). Those are "success"
  greens (hue 145, 60–70% saturation), the colour of a toast that says
  "Saved!", not of a pitch; filled into the Next pill and the position bar
  they gave the dark theme the neon-on-black sports-app look spec 03 §3.3
  set out to avoid.
- Club themes pushed every token to at least half the kit colour's
  saturation, and the signal to 85–90%: Arsenal got `#F4252C`, Liverpool
  a hot pink-red `#EE2C4C`, Everton and Chelsea electric blues (`#3877F5`,
  `#157CF3`) close to Tailwind's `blue-500`; paper was tinted pink, blue or
  yellow at 48% saturation, and dark paper went maroon (`#220C0C`) or brown
  (`#221C0C`).
- Two text pairs outside the checked list failed AA: the toast's action
  (signal text on the action fill, 3.8:1 before and worse after) and
  selected text in dark (light ink on the light signal).

Changed (commit below), keeping the owner's 2.5.0 direction (a neutral
base with pitch green as the accent) but mixing the values from the
subject rather than a stock set:
- Light: newsprint `#F4F4F0` paper (neutral, a touch warm, not beige),
  printer's black `#1A1B18`, grass green `#67A03E` for the signal (hue 95,
  44% saturation: mown turf, not a success toast), dark turf `#265A32` for
  buttons, `#2F6B2A` for wins, brick `#A83C33` for losses, newsprint grey
  for draws, a green-black `#1D3A2C` chalkboard with warm chalk `#F3F2EA`.
- Dark ("Floodlit"): a night `#121411` with the faintest green in it,
  chalky floodlit grass `#93BA69` for the signal, a dusty turf `#6E9A55`
  for buttons: lit, not glowing.
- All 28 checked pairs pass (ink on paper 15.7:1; signal ink on signal
  5.5:1 light, 8.3:1 dark). `tokens.test.js` pins the new values and fails
  if any stock success-green (Flat UI, iOS, Tailwind) comes back.
- `clubTheme.js`: surfaces are now capped at a whisper of the kit colour
  (paper at 20% saturation, dark paper 16%), buttons and boards at 62%,
  the signal at 40–60%; results use the default theme's turf hue (114)
  instead of emerald (145). Arsenal's signal is now `#D45458`, Everton's
  `#547ED4`; every club still passes every pair in both modes.
- The toast action is paper-on-action with an underline; selected text
  uses `--signal-ink`. Manifest, `theme-color` metas and the share slip's
  fallbacks follow the new values.

### 2.5 Typography (V2, part of V3)

Found:
- Barlow Condensed 800 set every headline, title, score and number: the
  heavy condensed grotesque of the sports-app template (Oswald, Bebas
  Neue and Barlow Condensed are the usual three). IBM Plex Mono set the
  vidiprinter and every number line: the default "techy" mono. Barlow
  itself (text) is not a stock pick and reads well small.
- The same mono, 13 px, uppercase kicker (`SEASON 1 · 2026-27`, `WEEK 1 ·
  HOME`, `CLUB SEASON`, `NEXT`, `SIGNED`, `OUT OF REACH`) was pasted into
  six CSS modules, although spec 04 §3.3 says uppercase only for the
  vidiprinter and slot codes.

Changed (commit below), each face chosen for a job in the subject:
- **Headlines: Newsreader** (Production Type, OFL; 600 and 800). A serif
  drawn for news reading on screen, and the voice of a broadsheet's sport
  pages rather than a sports app: "Safe" on the back page, "Era XI" as a
  nameplate, the top-bar titles, cuttings, scores, stamps and section
  heads. New `--font-headline` token.
- **Vidiprinter and figures: Courier Prime** (Quote-Unquote Apps, OFL;
  400 and 700). The teleprinters that printed the classified results
  were typewriters on a wire; a Courier says that, a coder's mono says
  "developer tool".
- **Kept Barlow** for text and controls and **Barlow Condensed** for the
  chalk labels on the board, chips and the XI mark: a narrow face is the
  right tool for surnames under a marker, and demoted from headline duty
  it stops reading as a template. `src/pitch/**` is untouched; the board
  only follows the tokens.
- One global `.strap` (sentence case, bold, secondary ink, how a paper sets
  the line over a headline) replaces the five pasted mono kickers; `Signed`
  and `Out of reach` lose their caps. Uppercase remains for the
  vidiprinter, the results lines, slot codes and the career code.
- Cutting titles drop from 24 px condensed to 18 px serif so every
  club-season in the archive fits one line on a 390 px phone (the longest,
  "Wolverhampton Wanderers 2010-11", broke at the hyphen at 20 px).
  Measured with a scripted draft on the iPhone 13 profile (390×664): the
  lowest cutting edge over 11 picks is 621 px, 14 px higher than the 635
  px the same draft reached before this commit; Pixel 7 (412×839), 688 px.
- Files: `newsreader-latin-{600,800}-normal.woff2`,
  `courier-prime-latin-{400,700}-normal.woff2` with their OFL texts, from
  `@fontsource/*` 5.3.0; the IBM Plex Mono files and licence are gone.
  `tokens.test.js` pins the eight faces; `npm run build:standalone` still
  inlines all eight. The share slip draws with the same faces. About names
  them.

### 2.6 UI patterns (V3)

Found:
- **A coloured stripe down the left of a card**, the most-cited AI tell in
  the UI sources: the coach's note (`ui/Callout`) and the Home notice.
- **Stat tiles** in Club › Record: a grid of small grey labels over big
  numbers ("Best finish / 14th · 2026-27", "Titles / No titles").
- **Card in card**: on match day the identity line, itself a bordered
  panel, sat inside the fixture card.
- **Pills**: besides the chips (spec 04 §3.4 asks for pill chips), the
  Next action and both identity labels were pills. The Next pill was 36 px
  tall, under the 44 pt target spec 04 §8.2 sets, and at 390 px it pushed
  the screen title down to "Se…".
- **The position bar** on match day and the vidiprinter was a full-width
  block of the signal colour, the loudest thing on screen for a line of
  text.
- Shadows: none outside the chalkboard's lifted markers, where they mean
  "picked up". The one radius (4 px) with pill chips is spec 04's, kept.

Changed (commit below):
- Coach's note and Home notice are boxouts: a heavy ink rule on top and a
  tinted panel, as a paper sets a sidebar, matching the cuttings' top rule.
- The record's totals are a fact box: one ruled line each, label left,
  figure right, under a heavy rule.
- The identity line is a ruled band, not a panel, so it nests nowhere.
- Identity labels are stamps (square corners, 2 px ink border); the Next
  action is a 44 px paper-cornered button whose "Next" label is dropped
  under 600 px, and the top bar keeps 6.5 rem for the title.
- The position bar is the vidiprinter's strip: chalk on the slate, with
  chalk-outlined Pause and Skip.

Logged, not changed:
- Small buttons (`size="sm"`: Redraw, Reset shape, Pause, Skip, Sign to
  bench, Copy) are 36 px tall, below spec 04's 44 pt (they pass WCAG
  2.2's 24 px). Raising them changes the draft desk's height, which the
  fold criterion depends on; worth a pass of its own.
- `src/pitch/**` (the bench label and the "empty" slot label now render in
  Courier Prime through the mono token) is left to the orchestrator's
  chalkboard work.

### 2.7 Icons, motion and imagery (V4, V5)

Found:
- **Motion on everything**: every `Slip` (the Home resume card, the
  career-complete record), every coach's note and every opened fold faded
  and slid in 8 px, whether or not anything had arrived. The one easing,
  `cubic-bezier(0.2, 0, 0, 1)`, is Material 3's stock curve.
- **Icons**: a generic 2 px line set in the Feather/Lucide manner. Most
  are the controls every app has (back, close, chevron, plus, minus,
  copy) and the share glyph is the iOS one on purpose (it opens the system
  share sheet). The Home control was a stock house, where spec 04 §4.1 has
  "the top-bar mark" take you home. No emoji or sparkles anywhere; the ✓
  redraw ticks and the vidiprinter's block cursor are in-voice.
- **The share slip** opened with an 18 px band of signal colour and set its
  strap in uppercase mono, and its record line ran off the right edge of
  the 1080 px image ("· 43 pts · 14" and no more) whenever the record was
  long. The app icon still used the old slate and chalk.

Changed (commit below):
- Slips are still unless they arrive: a new match report, the half-season
  stop and the finished team sheet slide in; sheets and toasts keep it;
  notes, folds and resting slips no longer move. Two curves replace the
  Material one: `--ease` (a slip of paper lands fast and settles) and
  `--ease-stamp` (a stamp accelerates into the page), used by the reveal.
- The Home button is the XI mark with its chalk underline (`MarkIcon`),
  still labelled "Home".
- The share slip is set like the back page: "Era XI" as a nameplate with
  the season as its strap, a double rule, the headline, and the record
  wrapped at its " · " breaks so it always fits. The signal band is gone.
- `scripts/make-icons.mjs` uses the new slate and chalk; `npm run icons`
  regenerated `public/icon.svg` and the four PNGs.

Logged, not changed:
- The XI mark's strokes have round caps (the rasteriser draws capsules),
  which reads friendlier than chalk or print; squaring them means
  rewriting the rasteriser's distance function.
