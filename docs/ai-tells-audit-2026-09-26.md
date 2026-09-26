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

_Appended per group below as the work lands._
