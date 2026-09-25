# Implementation Plan: Redesign, career depth and App Store release (v2.0 → v3.0)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task once the owner has approved it. Steps use checkbox (`- [ ]`) syntax for tracking. **No task in this plan starts until the owner has reviewed the six specs and the decision table in §2.**

**Goal:** Replace the v1.1 UI with the "Back page and chalkboard" design, make the career worth paying for, and ship the game on the Apple App Store as a free download with a one-time "Full career" unlock, without introducing a backend or accounts.

**Architecture:** One codebase, three build targets (`web`, `standalone`, `native`). The engine is untouched except for the Phase 2 subset in milestone C. All platform differences go through `src/platform/`. New UI under `src/ui`, `src/pitch`, `src/screens`, `src/app`, `src/styles`, `src/content`, built behind the Phase 1 spec's `?layout=v2` flag until v2.0 makes it the default. Capacitor 8 wraps `dist-native/` for iOS.

**Tech stack:** React 18.3, Vite 5.4 (upgrade to Vite 6/7 is still a separate change), CSS Modules + CSS custom properties (Tailwind removed at B11), Vitest 3.2, Playwright 1.63 + axe, Capacitor 8 (`@capacitor/core`, `ios`, `preferences`, `haptics`, `share`, `status-bar`, `splash-screen`), a StoreKit 2 purchases plugin (05 A8), Node 24, Xcode 26.

**Specs:**
- [01 Design research](../specs/2026-09-25-01-design-research.md)
- [02 Gap analysis](../specs/2026-09-25-02-gap-analysis.md)
- [03 Competitive research](../specs/2026-09-25-03-competitive-research.md)
- [04 UI redesign](../specs/2026-09-25-04-ui-redesign.md)
- [05 Commercial readiness](../specs/2026-09-25-05-commercial-readiness.md)
- [06 Viability extras](../specs/2026-09-25-06-commercial-viability-extras.md)

---

## 1. Milestones and releases

| Milestone | Release | Contents | Depends on |
|---|---|---|---|
| A. Redesign foundations | (behind flag) | tokens, primitives, chalkboard, shell, state changes, vocabulary | Owner sign-off on 03/04 decisions |
| B. Screens and v2.0 | **v2.0** (web + PWA) | every screen, accessibility, PWA/perf, housekeeping, old UI deleted | A |
| C. Career depth, part 1 | **v2.5** (web) | real league, ageing, cohesion memory, window constraint, balance thresholds | B (UI has the record book and strengths bars ready) |
| D. Native shell | **v3.0 beta** (TestFlight) | platform adapter, Capacitor project, native storage, IAP + free-tier gate, privacy manifest, policy | B (native-feel), C (career worth buying) |
| E. App Store release | **v3.0** | listing, age rating, rights sign-off, submission; then iCloud sync, Android, dailies | D |

The roadmap's Phase 2 remainder (own-club relegation, matchups,
difficulty, open-ended careers) and Phase 3 (match day) follow as v4.0
and v5.0; see the updated roadmap.

## 2. Owner decisions consolidated

Each spec proposes a default. The plan assumes the defaults; any change
alters the tasks marked with the decision id.

| Id | Decision | Default assumed | Spec |
|---|---|---|---|
| C1 | Product name | "Era XI" via one constant, pending trade-mark and App Store checks | 03 §6 |
| C2 | Rename tactics vocabulary (labels only) | Yes | 03 §3.2, 04 App. A |
| C3 | Club names | Real, with a display toggle | 03 §5 |
| C4 | Replace Transfermarkt club IDs | Yes | 03 §5 |
| U1 | Three-cutting draw replaces the wheel | Yes | 04 §5.2 |
| U2 | Two redraws per draft | Yes | 04 §5.2 |
| U3 | Hidden ratings: OV hidden, stats as five bands | Yes | 04 §5.3 |
| U4 | CSS Modules + tokens; Tailwind removed | Yes | 04 §10 |
| U6 | Bundled fonts Barlow / Barlow Condensed / IBM Plex Mono | Yes | 04 §3.3 |
| A1 | Capacitor 8 | Yes | 05 §2 |
| A2 | Free + non-consumable "Full career" | Yes (⚠ IAP mandatory either way) | 05 §3 |
| A3 | $99/yr Developer Program | Yes (⚠ required) | 05 §3 |
| A4 | Price | $4.99 / £3.99; $2.99 launch fortnight | 05 §3 |
| A5 | Web build becomes the free tier | Yes | 05 §7 |
| A6 | No accounts | Yes | 05 §5 |
| A7 | iCloud KVS sync | v3.1, not v3.0 | 05 §5 |
| A8 | IAP plugin | StoreKit-only plugin (Capawesome or Cap-go), not RevenueCat | 05 §6 |
| A9 | Analytics | None in v3.0 | 05 §6, 06 §2 |
| A10 | Android | After iOS is stable | 05 §10 |
| X1 | Career depth part 1 before the App Store | Yes (milestone C) | 06 §1 |
| X3 | Localisation | en-GB, strings externalised | 06 §3 |
| X4 | Daily draw in free tier | First daily each week free | 06 §4 |
| X5 | itch.io | Free-tier page at v2.0 | 06 §5 |

**Owner actions that are not code** (each blocks the milestone named):
trade-mark and App Store name check for C1 (blocks B11's rename in
public copy); rights review of club names, player names and dataset
provenance per 03 §5 (blocks E3); Apple Developer Program enrolment
(blocks D7); privacy policy sign-off (blocks E3).

## 3. Global constraints

- Everything from the Phase 1A plan's constraints still applies: Vite 5.4, no TypeScript, dependency rule `data ← engine ← state ← components/screens ← App`, `Math.random` banned outside cosmetic code, storage keys and save envelope unchanged except `saveVersion: 2` with `migrations[1]`.
- `tests/golden/profiles.json` may change **only** in task A6 (readout/tier copy) in its own commit stating the reason; `seasons.json`/`league.json` may change only in C1/C5 in their own commits.
- No string in `src/content/`, `src/screens/`, `src/ui/` or `index.html` may match `/football manager|premier league|\bFM\b/i` (test added in A6).
- Screens never import Capacitor; only `src/platform/**` does.
- After each task: `npm run lint`, `npm test`, `npm run build`; UI tasks also `npm run e2e`.
- Commit messages end with the attribution trailer given in the session reminder.

---

## Milestone A — Redesign foundations (behind `?layout=v2`)

### A1. Tokens, base styles, fonts, contrast check
- Create: `src/styles/tokens.css`, `src/styles/base.css`, `public/fonts/*.woff2` (Barlow 400/600, Barlow Condensed 600/800, IBM Plex Mono 400/600, subset to Latin), `scripts/check-contrast.mjs`, `tests/unit/tokens.test.js`.
- Tokens exactly as 04 §3.2; light default, dark under `[data-theme="dark"]` and `@media (prefers-color-scheme: dark)` guarded by `:root:not([data-theme="light"])`.
- `check-contrast.mjs` parses the token file and asserts the pairs in 04 §3.2; wired into CI after lint.
- Verify: script passes; fonts load offline in `vite preview` (no external requests in the network log).

### A2. Primitives (`src/ui/`)
- Create each primitive from 04 §10 with a `.module.css` and an RTL test for keyboard and ARIA: `Button`, `IconButton`, `Chip`, `ChipRow` (radiogroup, arrow keys), `Segmented`, `Toggle`, `Dial` (range + −/+ steppers + ⓘ), `Disclosure` (`aria-expanded`/`aria-controls`), `Sheet` (dialog, focus trap, Esc/backdrop/swipe > 80 px, returns focus), `TabBar` (tablist), `TopBar`, `NextPill`, `Term` (opens a `Sheet` with the definition; nested), `Callout`, `Toast`, `Meter`, `StrengthBars` (with reference tick), `Stamp`, `Ticker`, `Cutting`, `TeamSheetRow`, `Slip`, `Table`, `LiveRegion`.
- Motion: `slip`, `type`, `stamp` as CSS classes; all disabled under reduced motion.
- Verify: `npm test` green; a Storybook is **not** added (keep deps flat); instead `src/screens/_gallery/Gallery.jsx` renders every primitive in both themes at `?layout=v2&gallery=1` for manual and visual-snapshot checks.

### A3. Chalkboard (`src/pitch/`)
- Move `usePitchDrag` unchanged; add `usePitchKeyboard` (04 §8.3); create `Chalkboard`, `Marker` (44 pt hit area, `aria-label`), `BenchRail`, `PitchLines`.
- `Chalkboard` props: `assignments`, `bench`, `mode: "draft" | "board" | "view"`, `activeSlotId`, `highlightSlots` (for the window's Replace flow), callbacks.
- Tests: existing `usePitchDrag.test.jsx` moves; new keyboard tests (select, nudge, swap, cancel, E opens sheet); tap-vs-drag threshold; single drop dispatch.

### A4. Shell, navigation, next action
- Create: `src/app/Shell.jsx`, `src/app/nav.js` (UI nav state: `mode`, `tab`, `sheet`), `src/state/selectors.js` `selectNextAction`, `src/state/prefs.js` (`fmweb.prefs`: `layout`, `theme`, `reduceMotion`, `haptics`, `clubNames`, `seenNotes`).
- `App.jsx` chooses old or new tree by the `layout` pref; the new tree mounts `Shell` with the tab bar / rail per 04 §6.
- Tests: `selectNextAction` for every phase; Shell renders tab bar below 600 px and rail at 1024 px (jsdom with `matchMedia` stub).

### A5. State changes and save v2  *(U1, U2)*
- `state/initialState.js`: `draw: { options: [], redrawsLeft: 2 }` replaces `wheel`, `pool`, `poolRelaxed`; add `seasonHistory: []`.
- `state/reducer.js`: `SPIN` → `DRAW` (sets `draw.spinning`), `LAND` draws three distinct era entries via one `takeRng` and builds `options` with `buildPool` per entry; `REDRAW` decrements `redrawsLeft` and re-lands; `PICK_PLAYER` takes `{ player }` (the player object carries `seasonKey`); `GOTO_TRANSFER` appends the season summary to `seasonHistory`; `NEW_GAME`/`SET_FORMATION` reset `redrawsLeft`.
- `state/save.js`: `SAVE_VERSION = 2`; `migrations[1]` maps `wheel/pool/poolRelaxed` → `draw` (a landed wheel becomes one option) and adds `seasonHistory: []`; `isValidState` updated; `hydrateState` resets a mid-draw `spinning`.
- Tests: `reducer-career.test.js` walkthrough updated to draw/pick with three options and one redraw; `reducer-determinism.test.js` still passes (same seed → same three options); `save.test.js` migrates a real v1.1 fixture (`tests/fixtures/save-v1.json`, captured from the current build) and round-trips v2.
- Old `DraftScreen`/`WheelSpinner` keep working through a thin compatibility selector (`selectLegacyWheel(state)`) until B11 deletes them.

### A6. Vocabulary, content, name constant  *(C1, C2)*
- Create: `src/content/labels.js` (04 Appendix A), `src/content/terms.json`, `src/content/notes.json`, `src/content/strings/en-GB.json` + `src/content/t.js` (ICU plurals; X3), `src/content/product.js` (`PRODUCT_NAME = "Era XI"`, `SHARE_TAG`, `EXPORT_PREFIX`).
- Change labels/descs in `engine/roles.js`, `engine/instructions.js`, `engine/readout.js` (`mentalityLabel`), `engine/familiarity.js` (`familiarityLabel`), `engine/season.js` (`seasonTier` names) — **keys and numbers unchanged**.
- Re-record `tests/golden/profiles.json` in its own commit: "Re-record readout copy after vocabulary rename; formulas unchanged" — the test asserts `familiarity` and `profile` numbers byte-for-byte and the readout strings against the new file.
- `tests/unit/copy-lint.test.js`: greps `src/content`, `src/screens`, `src/ui`, `index.html` for the banned terms; passes only once B11 has retired the old components (until then it's scoped to the new dirs).
- Verify: `npm test`; `npm run sim` output identical to before the commit (numbers only).

---

## Milestone B — Screens and v2.0

Each screen task: build under `src/screens/…`, wire into `Shell`, RTL
render test on a fixture state, Playwright step in the v2 smoke test,
axe check, visual snapshot at 375/1280 in both themes.

### B1. Home and New career
- `Home` (resume card from `selectNextAction`, New career, links), `NewCareer/Era` (chips + range slider rebuilt as two `role="slider"` handles with keyboard), `NewCareer/Formation` (chalk mini-shapes).
### B2. Draft  *(U1, U2)*
- `Draft/Draw` (ticker → three `Cutting`s), `Draft/CuttingSheet` (team sheet rows in shirt order, relaxed notice, off-position marks), `Draft/ConfirmPick` (cohesion delta from a pure helper `previewPick(state, player)` in `state/selectors.js` that calls `computeFamiliarity` on the hypothetical XI), redraw ticks, squad strip, Pause, `TeamSheetSlip`.
- Phone check in Playwright: Draw button and three cuttings in view at every pick.
### B3. Squad tab  *(U3)*
- `SquadTab`, `PlayerSheet` (five-band pips, job/brief, dials, Swap with…). `StatPip` numbers removed everywhere in the new tree.
### B4. Board tab
- `BoardTab` with identity line + `Meter`, `StyleRow` (Blank slate relabel), `Approach`, `InstructionGroups` (two `Disclosure`s with summaries), `Strengths` (`StrengthBars` with opponents' average from `state.opponents`), sticky Kick off. Every dial has a `Term`.
### B5. Season tab and sharing
- `Preseason`, `TeamSheetReveal` (stamp), `Vidiprinter` (type, sticky position ticker, Pause/Skip, half-season slip at week 19, `aria-live` only at pauses), `BackPage` (headline, standfirst, record, table/matches disclosures, Strengths, Share, Open the window / Career complete), `Window` (cuttings, Replace highlights slots on the chalkboard, league changes notice, Close the window).
- Share: `src/app/share.js` renders the slip to a 1080×1350 PNG via canvas and calls `navigator.share`; fallback download + clipboard.
### B6. Club tab
- `Record` (from `seasonHistory`), `CareerCode` (seed ↔ 6-group code, Copy, Start from code → `NEW_GAME { seed }`), `Saves` (export/import moved from `SaveMenu`, storage banner), `Settings` (prefs), `About` (version, licences, privacy policy link; Restore purchases appears in D5).
### B7. First run and coach's notes
- `FirstRun` three slips; `Callout` per tab from `notes.json`; `seenNotes` in prefs.
### B8. Accessibility pass and test matrix
- Viewport meta fixed; `LiveRegion` wired; reduced-motion paths; keyboard shortcuts (1–4, K, D); iOS text-size test at 200%; axe on every screen in all three Playwright projects; visual snapshots committed under `tests/e2e/__snapshots__`.
### B9. PWA, offline, performance (Phase 1 spec §7, unchanged)
- `vite-plugin-pwa` ^1.3, manifest with the new name/colours/icons, `UpdatePrompt`, install menu item, `scripts/check-bundle-size.mjs` (≤ 120 KB gzipped app code), standalone mode via `vite-plugin-singlefile` in CI, offline Playwright test.
### B10. Housekeeping  *(C3, C4)*
- `LICENSE` (MIT, dataset excluded); `scripts/rekey-clubs.mjs` replaces Transfermarkt club IDs with slugs in `players.json`/`championship.json` and `index` (save format stores `seasonKey` strings → `migrations[1]` also rewrites keys; do this **before** any v2 save exists in the wild, i.e. in this milestone); club-name display toggle reads `content/clubs.json` overrides; README rewritten without the banned terms and with the new name; data derivation documented in `docs/data.md`.
### B11. Make v2 default, delete v1, release
- Remove the `layout` flag and `src/components/**`, `src/index.css`, Tailwind and PostCSS deps and config; `copy-lint` test widened to all of `src/`; device checklist (Phase 1 spec §12 plus 04 §12); bump to 2.0.0; changelog; tag `v2.0.0`; itch.io page for the free tier (X5).

---

## Milestone C — Career depth, part 1 (v2.5)  *(X1)*

### C0. Data pipeline
- Try to recover `build_final.py` and its inputs; failing that, write `docs/data.md` describing the rating derivation from the README's notes and produce `scripts/derive-ratings.mjs` that can regenerate `ov`/stats from a documented input format, so C5 can tune. Owner confirms provenance per 03 §5 (blocks E3, not C).
### C1. Real league
- `engine/season.js`: `simulateLeague(profile, familiarity, opponents, rng)` plays every fixture for all 20 teams using a symmetric `simulateMatch` for rival-vs-rival (opponent strength on both sides); the user's fixtures stay as today. `estimateClubPoints` removed. `seasons.json` re-recorded in its own commit. Table copy loses "estimated". Playwright unchanged.
### C2. Ageing and development
- `engine/players.js` `progressPlayer(player, rng)`: age +1; stats drift by an age curve (peak 26–29, decline after 31, pace first); `ov` recomputed from stats with the existing archetype weights. Applied to XI and bench in `CONTINUE_SEASON`. Retirement at 36+ frees the slot (bench first). Tests on the curve's monotonic regions.
### C3. Cohesion memory
- `state`: `cohesionMemory { formationKey, styleKey, seasons }`; `computeFamiliarity` gets an optional `memory` argument adding `+2` per consecutive season in the same formation+identity (cap +8) and `−4` on change; `profiles.json` unchanged because the golden inputs pass no memory.
### C4. Transfer window constraint
- Abstract **wage points**: the window offers eight candidates with a cost from `ov` band; the club has a budget from last season's finish. Reducer enforces it; UI shows the budget on the Window screen. (Realistic money is still Phase 2.)
### C5. Balance thresholds
- `scripts/sim.mjs` gains `--assert`: no style's best-pick title odds above 45% or below 12%; random-pick bottom-three odds between 3% and 12% for every style; wired into CI. Tune `identitySynergy`, preset values and `compress` until green; `seasons.json`/`league.json` re-recorded in one commit with the resulting table pasted into the message.
### C6. Release
- Save `saveVersion: 3` with migration (ages, memory, budget); ten-season careers run in a soak test; bump 2.5.0; tag.

---

## Milestone D — Native shell (v3.0 beta)

### D1. Platform adapter  *(A1)*
- `src/platform/{index,storage,cloud,entitlements,share,haptics}.js` with web implementations; `App.jsx` and `Club/Saves` switch to `platform.storage`; Vitest suites for the web adapter and for each native adapter against a mocked plugin.
### D2. Capacitor project
- `npm i @capacitor/core @capacitor/cli @capacitor/ios @capacitor/preferences @capacitor/haptics @capacitor/share @capacitor/status-bar @capacitor/splash-screen`; `capacitor.config.json` (`appId` from the owner's reverse-domain, `webDir: dist-native`, `ios.contentInset: "always"`); `vite build --mode native` (no PWA plugin, no service worker, `base: "./"`); `ios/` committed (Pods excluded; SPM default).
- CI: a `native-build` job on `macos-latest` runs `npx cap sync ios && xcodebuild -scheme App -sdk iphonesimulator build` (no signing) so the wrapper can't rot.
### D3. Native storage
- `storage.native.js` on `@capacitor/preferences`; one-time import of any existing WKWebView `localStorage` save on first launch (for TestFlight testers); `PrivacyInfo.xcprivacy` with `NSPrivacyAccessedAPICategoryUserDefaults` reason `CA92.1`.
### D4. Native feel
- Status bar style from theme, splash from `--slate`, app icon set from the XI mark, haptics wired to pick/land/verdict, Share plugin, `overscroll-behavior`, safe-area check on iPhone with and without a home button, iPad layout check.
### D5. Purchases and the free-tier gate  *(A2, A4, A8)*
- Product `fullcareer` (non-consumable) in App Store Connect; `entitlements.native.js` on the chosen plugin: `isUnlocked()` from current entitlements at launch and after purchase/restore, cached in Preferences; `purchase()`, `restore()`; `Club/About` gets Buy (with price from the store) and Restore; `BackPage`'s "Open the window" checks `isUnlocked()` and otherwise shows the purchase sheet; web shows "Continue on iPhone" (A5). Tested in the sandbox with a sandbox tester account, including restore on a second device.
### D6. Privacy manifest, policy, plist
- `PrivacyInfo.xcprivacy` (no tracking, no collected data types), `ITSAppUsesNonExemptEncryption = NO`, privacy policy page live at `/privacy` and linked in About; App Store Connect privacy label "Data Not Collected".
### D7. TestFlight
- Archive, upload, internal then external test (≥ 20 testers, 2 weeks); the 06 §8 checklist items that apply to the beta.

---

## Milestone E — App Store release (v3.0) and after

### E1. Listing
- Name (C1), subtitle, description, keywords (no competitor or competition marks), screenshots from the real build (6.7", 6.1", iPad 13"), preview video optional, category Games › Sports, age rating questionnaire (expected 4+; IAP declared; gambling/contests none), pricing tier and launch price (A4), Small Business Program enrolment.
### E2. Sign-offs
- Rights review (03 §5) complete; privacy policy approved; `LICENSE` present; device checklist complete; `npm run sim --assert` green; keyboard and VoiceOver run-through.
### E3. Submit
- App Review notes as 06 §8; submit; on rejection, fix and resubmit (common risks and prepared answers: 4.2 native feel, 3.1.1 restore visible, 5.1.1 no data).
### E4. After release
- v3.1 iCloud KVS sync (A7): `cloud.native.js`, conflict prompt, Settings toggle default on.
- v3.2 Android (A10): `npx cap add android`, Play Billing via the same plugin, Play listing.
- v3.x Today's draw and challenge modifiers (06 §4), first localisation (06 §3), opt-in telemetry only if the owner decides (X2).

---

## 4. Verification summary

| Gate | Check |
|---|---|
| Every task | lint, unit, build; e2e for UI tasks |
| A6 | `profiles.json` numbers unchanged; only `readout` strings differ (diff reviewed) |
| B11 | 04 §12 acceptance criteria; Lighthouse; device checklist; owner sign-off |
| C5 | `npm run sim -- --assert` green in CI |
| C6 | v1.1 and v2.0 saves migrate; ten-season soak test |
| D5 | Sandbox purchase, restore on second device, no unlock on a different Apple ID |
| D7/E3 | TestFlight feedback triaged; App Review passed |

## 5. Risks

| Risk | Mitigation |
|---|---|
| Owner rejects a default (e.g. U1 three-cutting draw) after A5 is built | A5 keeps `options.length` as a constant; a one-cutting draw is `DRAW_OPTIONS = 1` |
| Trade-mark search fails on "Era XI" | The name is one constant (`content/product.js`); the App Store listing isn't created until E1 |
| Balance tuning in C5 never converges | Thresholds are wide; if two styles remain outside after a day's tuning, widen with the owner and record the table |
| Guideline 4.2 rejection ("website") | 04 §8 native-feel list; App Review notes; TestFlight on real devices first |
| IAP plugin abandoned | `entitlements.native.js` is ~100 lines against a StoreKit-shaped interface; swapping plugins is contained |
| iCloud KVS 1 MB | Save measured at 16.5 KB; a guard refuses to sync above 512 KB and shows a notice |
| Dataset rights review demands changes late | C4 slug rekey and the club-name toggle make the data a file change; do them in B10, before v2 saves exist |
