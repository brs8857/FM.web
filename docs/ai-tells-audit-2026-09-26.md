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
layout there), `src/screens/Draft/Draw.jsx`, `Draft.jsx` and
`src/app/FirstRun.jsx` (changed on `claude/zen-feynman-hler0e`), to be
done after the merge. Engine constants exported only for their own file
(`HOME_ADVANTAGE`, `STOPPAGE_CHANCE`, …) stay exported: they are the
tunables `sim.mjs` users look for.
