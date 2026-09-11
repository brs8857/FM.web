# Phase 1 Design: Foundation, then Reach & Polish

| | |
|---|---|
| **Status** | Approved by owner, 2026-09-11 |
| **Date** | 2026-09-11 |
| **Releases** | v1.1 (foundation), v2.0 (reach & polish) |
| **Roadmap** | [docs/roadmap.md](../../roadmap.md) |
| **Baseline** | `main` @ `6495fb8`, live at https://brs8857.github.io/FM.web/ |
| **Review** | [docs/code-review-2026-09-11.md](../../code-review-2026-09-11.md) |

This spec is carried out through **two implementation plans**. Plan 1A covers rollout steps 1–7 and ends at v1.1. Plan 1B covers steps 8–12 and ends at v2.0. Plan 1B is written after v1.1 ships, so it's based on the real new code structure.

---

## 1. Goals

1. Make the code safe to change: split into modules, tested, and reproducible.
2. Players never lose a career: autosave on every device, plus export/import between devices.
3. Fix the review bugs that don't change game design.
4. Make the game good to play on phones and desktop browsers, installable and playable offline.
5. Make it accessible: zoom, keyboard play, screen readers, reduced motion.

## 2. Non-goals

- **Game rules and balance.** Rival points, style balance, player progression, familiarity growth, hidden-ratings rules and relegation for your own club are Phase 2. Every simulation formula stays numerically identical (§9.1).
- **Match-day features** (Phase 3).
- **A desktop app** (Electron/Tauri). The old Electron build is retired.
- **Onboarding or a tutorial.**
- **Accounts, cloud sync, any backend, analytics or tracking.**
- **Visual identity changes** (colours, fonts, name, logo).
- **TypeScript**, and **upgrading Vite beyond 5.x** (§11).

## 3. Decisions

All made 2026-09-11 during brainstorming.

| Topic | Decision |
|---|---|
| Platforms | Phones and desktop browsers. The PWA covers installing on desktop. |
| Build approach | Step by step on `main`; every step ships. No rewrite. |
| Visual polish | Keep the current look; rebuild the layouts. |
| Tactics screen (phone) | Pinned pitch with an accordion below: Style of Play / Instructions / Analysis. |
| Player editor (phone) | Bottom sheet over the screen. |
| Style of Play (phone) | Chip row plus a detail card. |
| Draft screen (phone) | The same pinned-pitch pattern as tactics. |
| Keyboard positioning | Select a player, then use arrow keys to nudge. |
| Saves | One autosave per device, plus export/import as a file. |
| Onboarding | None in Phase 1. |
| Release | Foundation ships as v1.1. New layouts sit behind `?layout=v2` until v2.0. |
| Test runner | Vitest 3.2.x. Newer Vitest requires Vite ≥ 6.4. |

---

## 4. Architecture

### 4.1 Module layout

```
src/
  data/
    players.json          { clubs, squads, index, opponents }  (was DATASET)
    championship.json     [ ...24 clubs ]                      (was CHAMPIONSHIP_POOL)
    loadDataset.js
  engine/                 pure logic: no React, no Math.random, no storage
    rng.js  players.js  formations.js  roles.js  instructions.js
    tactics.js  familiarity.js  readout.js  match.js  season.js
    league.js  squad.js
  state/
    initialState.js  reducer.js  rngState.js  selectors.js  save.js  prefs.js
  components/
    ui/        Button, StatPip, OvBadge, Slider, RadarChart, Accordion,
               BottomSheet, ChipGroup, StickyActionBar, Toast, Menu
    pitch/     Pitch, PitchMarkings, BenchStrip, PinnedPitch,
               usePitchDrag, usePitchKeyboard
    screens/   FormationSelect (+EraRangeSlider), Draft (+WheelSpinner),
               Tactics (+StyleSelector, InstructionsPanel, RoleEditor,
               TacticsSummary), RatingsReveal, Result, Transfer
    app/       ErrorBoundary, DatasetGate, UpdatePrompt, SaveMenu
  App.jsx      header, switching between screens, layout flag
  main.jsx
  index.css    Tailwind, plus the fmweb-* styles moved out of the inline <style>
```

**Dependency rule:** `data ← engine ← state ← components ← App`. Nothing lower in that list imports from anything higher. ESLint enforces two things (`no-restricted-imports`, `no-restricted-properties`):
- `engine/` and `state/` never import React.
- `Math.random` isn't used anywhere except `components/screens/Draft/WheelSpinner`, where the flicker is purely cosmetic.

### 4.2 Module responsibilities

| Module | Responsibility (moved from `src/App.jsx` unless marked new) |
|---|---|
| `data/loadDataset.js` | `loadDataset(): Promise<Dataset>`. Dynamically imports both JSON files once and caches the result. The Vite config sets `json.stringify: true` so the data is parsed as JSON. |
| `engine/rng.js` | **New.** `createRng(seed)` is a mulberry32 generator returning `{ next(), int(n), pick(arr), shuffle(arr) }`, where shuffle is a Fisher–Yates shuffle that doesn't modify its input. `deriveSeed(careerSeed, counter)` is also here. |
| `engine/players.js` | `rowToPlayer`, `createSquadLookup(dataset)` (a cached `getSquad`), `buildPool` (now returns `{ players, relaxed }`), and **new** `playerIdentity` / `isSameRealPlayer` (§6.3). |
| `engine/formations.js`, `roles.js`, `instructions.js` | `FORMATIONS`, `SLOT_TYPE_LABEL`, `ROLES`, `DUTY_INFO`, the default role and duty helpers, `DEFAULT_INSTRUCTIONS`, `STYLE_PRESETS`. |
| `engine/tactics.js` | `compress`, `executionMultiplier`, `positionFactors`, `playerContribution`, `computeTeamProfile`, `identitySynergy`. |
| `engine/familiarity.js` | `computeFamiliarity`, `familiarityLabel`. |
| `engine/readout.js` | `tacticalReadout`, `mentalityLabel`. |
| `engine/match.js` | `poissonSample(lambda, rng)`, `simulateMatch(profile, opp, isHome, familiarity, rng)`. |
| `engine/season.js` | `roundRobinSchedule`, `buildUserFixtureList`, `estimateClubPoints(opp, rng)`, `simulateSeason(profile, familiarity, opponents, rng)`, and `seasonTier` (split out of `simulateSeason`). |
| `engine/league.js` | `drawPromotedClubs(pool, count, excludeNames, rng)`, `applyPromotionRelegation(opponents, table, pool, rng)`. |
| `engine/squad.js` | `autoFillBench`, `generateShortlist(lookup, index, era, owned, rng)`, `signToSlot`, `signToBench`. |
| `state/reducer.js` | `createReducer(dataset)` returns `(state, action) => state`. |
| `state/rngState.js` | `takeRng(state)` returns `[rng, stateWithCounterIncremented]`. |
| `state/selectors.js` | `liveAssignments`, `selectFamiliarity`, `selectProfile`, `selectEraIndex` (one copy instead of today's two). |
| `state/save.js` | Serialise, validate, migrate, autosave, export, import (§6). |
| `state/prefs.js` | The `fmweb.prefs` storage key, holding the `layout` preview flag. |

---

## 5. Screens and layouts

### 5.1 Screen sizes and shared components

| Size | Width | Layout |
|---|---|---|
| Phone | < 768 px | Pinned pitch, content scrolling below, sticky action bar |
| Tablet | 768–1023 px | Two columns: pitch on the left, phone-style panels on the right |
| Desktop | ≥ 1024 px | Today's multi-column layouts, rebuilt from the same components |

- **`PinnedPitch`:** a sticky compact pitch, at most 45 vh tall on phones, keeping the 68:100 pitch proportions. Used on the draft and tactics screens.
- **`StickyActionBar`:** pinned to the bottom, with `padding-bottom: env(safe-area-inset-bottom)` for iPhone home-indicator space. Holds the screen's main button.
- **`Accordion`:**
  - One section open at a time.
  - Each header can show a short summary.
  - Headers are buttons with `aria-expanded` / `aria-controls`.
- **`BottomSheet`:**
  - Modal (`role="dialog"`, `aria-modal`) that keeps keyboard focus inside while open.
  - Closes with Esc, a tap on the backdrop, or a swipe down of more than 80 px.
  - Returns focus to whatever opened it.
- **Header:** on phones, one compact line on every screen with the tagline hidden, so the pinned pitch and the Spin button fit on the first screen.
- **`ChipGroup`:** `role="radiogroup"`. Arrow keys move between chips, and Enter/Space selects.
- **`Button`:** variants `primary`, `secondary`, `chip`. It replaces the repeated inline `style={{ background: "#059669" }}` CTAs.

### 5.2 Per screen

| Screen | Phone | Tablet / desktop |
|---|---|---|
| Formation | Header shrinks to one line (tagline hidden). Era and formation selection plus **Start the draft** fit in the first 812 px. "How the draft works" becomes a collapsed accordion. The pitch preview is shown below. | As today. |
| Draft | `PinnedPitch` with the slot being filled highlighted. The wheel and Spin button sit directly below it. On landing, the squad pool scrolls into view. If the pool had to fall back to other positions, a notice shows (§8, bug #3). | Pitch column plus the wheel and pool column, as today. |
| Tactics | `PinnedPitch` with a horizontally scrolling `BenchStrip` underneath, both inside the pinned area. Below: **Accordion** with **Style of Play** (chip row plus detail card, open by default), **Instructions** and **Analysis** (the header shows "Familiarity 61 · Solid · Gegenpress"). Tapping a player opens `RoleEditor` in a `BottomSheet`. **Reveal Ratings & Simulate** lives in the `StickyActionBar`. The drag hint moves below the pitch. | Tablet: pitch and bench on the left, the same accordion and bottom sheet on the right. Desktop: three columns (pitch+bench / style chips + instructions or the role editor inline / analysis). |
| Ratings reveal | The list stays as it is; **Kick Off** moves to the sticky bar. | As today. |
| Result | Verdict card first. **Final table** is an accordion section, open by default; **Match log** is collapsed by default; tactics summary follows. **Continue / Retire** go in the sticky bar after the season finishes. | As today, plus the same collapsible match log. |
| Transfer | One card per row. Stat labels are **PAC / SHO / PAS / DRI / DEF / PHY**, with full names in `aria-label` and `title`. **Continue** goes in the sticky bar. | Two columns, with the same short labels. |

### 5.3 Interaction and accessibility

- **Tap vs drag:** a pointer press becomes a drag only after it moves more than **8 px** from where it started. Anything less is a tap: pitch slot → open the editor, bench → select. Drops are handled only through `pointerup` / `pointercancel`, and a ref guard makes sure each drop is handled once (§8, bug #7).
- **Keyboard (pitch and bench):**
  - Tab moves between players. **Enter** selects one, and a visible focus ring marks the selection.
  - **Arrow keys** move the selected player 2 units; **Shift + arrow** moves 6 units. This goes through the existing `MOVE_PLAYER` action, which already keeps positions within the pitch.
  - **Enter** on another player or bench spot swaps the two (`SWAP_PLAYERS`). **Esc** cancels the selection. **E** opens the editor for the focused player.
- **Screen-reader labels:** every slot gets e.g. `aria-label="Goalkeeper slot, David Seaman. Press Enter to select, arrow keys to move."`, and bench spots get the same treatment. Moves and swaps are announced through an `aria-live="polite"` region.
- **Zoom:** the viewport meta becomes `width=device-width, initial-scale=1`, removing `maximum-scale=1, user-scalable=no`.
- **Touch targets:** at least 44 × 44 px. Pitch markers get a larger invisible hit area; the drawn circle can stay 36–40 px.
- **Contrast:** text meets WCAG AA (4.5:1). This includes the selected Style of Play card, which today uses `text-neutral-900` on `emerald-600`.
- **Reduced motion:** with `prefers-reduced-motion: reduce`:
  - The wheel shows its result without the flicker.
  - The ratings reveal shows every player at once.
  - The season result is shown straight away.
  - Screen-change fades are turned off.
- **Styling cleanup:** the inline layout styles `style={{ display: "flex", ... }}` are replaced with Tailwind classes, and the inline `<style>` block moves into `index.css`.

---

## 6. State, randomness and saves

### 6.1 State changes

| Field / action | Change |
|---|---|
| `careerSeed` | **New.** An unsigned 32-bit number. |
| `rngCounter` | **New.** An integer ≥ 0. It only ever goes up. |
| `draftedIdentities` | **New.** An array of `{ name, nat, birthYear }`, appended whenever a player is added to `draftedIds`. |
| `NEW_GAME { seed }` | Replaces `RESET`. The UI makes the seed with `crypto.getRandomValues`, so the reducer itself stays pure. |
| First launch | With no valid autosave, `initFromAutosave` (the `useReducer` initialiser, which runs outside the reducer) builds a fresh state seeded with `crypto.getRandomValues`. |
| `SET_FORMATION` | Keeps `careerSeed`, `rngCounter`, `eraMin` and `eraMax`, and resets everything else as today. |
| `LAND` | **No payload.** The reducer picks the club-season from the era index using `takeRng`. `onDoneSpin` in `App` goes away. |
| `SIMULATE`, `GOTO_TRANSFER` | Use `takeRng` for the season simulation, shortlist and promotion. |
| `LOAD_SAVE { state }` | **New.** Replaces the whole state with a save that has already been validated. |

`takeRng(state)` creates `createRng(deriveSeed(state.careerSeed, state.rngCounter))` and returns it together with the state with `rngCounter + 1`. `deriveSeed` hashes the seed and counter together (a splitmix32-style mix), so neighbouring counters give unrelated sequences.

### 6.2 Data flow

```
main.jsx → <ErrorBoundary> → <DatasetGate> (loading / error + Retry)
  → <App dataset> → useReducer(createReducer(dataset), undefined, initFromAutosave)
  → screens dispatch → reducer → engine(dataset lookups, rng) → state
  → useAutosave(state)
```

### 6.3 Player identity (the same real player twice, bug #4)

- `playerIdentity(player)` returns `{ name, nat, birthYear }`, where `birthYear = seasonYear − age`.
- `isSameRealPlayer(a, b)` is true when `name` and `nat` match and the two `birthYear`s differ by **no more than 1**. If either player has no age, `name + nat` alone decides.
- **Evidence from the dataset:**
  - 2,758 name+nationality pairs appear in more than one season.
  - 2,493 of them have the same birth year every season, and 244 are off by exactly 1 (birthday versus the date age is calculated on).
  - Only 21 are off by 2 or more, and those are genuinely different people (e.g. Alan Smith born 1962 and 1980).
  - 3 rows have no age.
- **Applies to:** `buildPool` (draft), `autoFillBench` and `generateShortlist`, all checked against `draftedIdentities`.

### 6.4 Autosave and resume

- **Where it's stored:** browser storage (`localStorage`) key `fmweb.save`.
- **When it's written:**
  - Immediately when `phase` changes.
  - Otherwise 500 ms after the last change.
  - Not written if the state hasn't changed since the last save.
- **Resuming:** when a valid save exists, the formation screen shows a **Continue career** card, e.g. "Season 3 · 2028-29 · Tactics", plus **New game**. New game asks for confirmation before replacing the save.
- **Persistent storage:** the first `NEW_GAME` calls `navigator.storage.persist()`. Denial is ignored.
- **What resets when a save loads:**
  - If the save was taken mid-spin (`wheel.spinning`), the wheel resets to not landed, and the pool empties.
  - A landed wheel and its pool are kept exactly as saved.
  - `App` holds a non-saved `resumedFromSave` flag. While it's set, `RatingsReveal` and `Result` show their finished state with no animation. It clears on the next change of screen.

### 6.5 Save file format

```json
{
  "app": "fm-web",
  "saveVersion": 1,
  "gameVersion": "1.1.0",
  "savedAt": "2026-09-11T20:00:00.000Z",
  "state": { "phase": "tactics", "season": 3, "careerSeed": 2893411307, "rngCounter": 41, "...": "..." }
}
```

- **Players are stored as full copies of their details**, not IDs: name, slot, side, age, nat, ov, stats, seasonKey. This covers assignments, bench, pool, shortlist and simulation. Re-tuning the data in Phase 2 therefore can't break saves.
- **Sets are stored as arrays** (`draftedIds`).
- **`validateSave(obj)`** returns `{ ok: true, save }` or `{ ok: false, reason }`. It checks:
  - `app === "fm-web"`.
  - `saveVersion` is an integer no newer than the current version.
  - `phase` is a known value.
  - `assignments` matches the formation's 11 slots.
  - Each player copy has all its fields and numeric stats.
  - There are 19 `opponents`.
  - `careerSeed` and `rngCounter` are valid numbers.
- **`migrations[n]`** upgrades version `n` to `n + 1`. It's empty in v1.1.
- **Rejection messages:**
  - "This isn't an FM.WEB save."
  - "Made with a newer FM.WEB. Refresh to update."
  - "This save file is damaged."

### 6.6 Export and import

- **Save menu:** a header menu button opens **Export save**, **Import save**, **Install app** (or the iPhone tip), and **About** (which shows the version).
- **Export:**
  - **Filename:** `fmweb-season{N}-{YYYY-YY}.json`, e.g. `fmweb-season3-2028-29.json`.
  - **Phones:** if `navigator.canShare({ files })` is supported, it uses the share sheet.
  - **Otherwise:** it downloads the file (Blob URL plus `<a download>`).
- **Import:**
  1. A file picker (`accept=".json,application/json"`) reads the file.
  2. `validateSave` checks it.
  3. If a career exists, the player confirms "Replace your current career (Season X)?".
  4. The app dispatches `LOAD_SAVE` and writes the autosave.

  If anything fails, a message is shown and the current state and autosave aren't touched.

### 6.7 When storage fails

| Situation | Behaviour |
|---|---|
| No `localStorage` (throws on access) | The game works. A dismissible banner says "Saving isn't available in this browser. Use Export to keep your career". Export still works. |
| Writing fails because storage is full | The same banner. The game carries on. |
| Autosave fails validation on launch | The raw value is moved to `fmweb.save.corrupt` and never deleted. A new game starts with a notice. |

---

## 7. Installable app, offline, performance and errors

### 7.1 Installable app (`vite-plugin-pwa` ^1.3)

- **Manifest:**

  | Field | Value |
  |---|---|
  | `name` / `short_name` | `FM.WEB` |
  | `theme_color` / `background_color` | `#07100c` |
  | `display` | `standalone` |
  | `orientation` | not set |
  | `start_url` / `scope` | `./` (works under the `/FM.web/` Pages path) |

- **Icons:** `public/icons/` holds 192 and 512 px versions, a 512 px maskable version, and a 180 px `apple-touch-icon.png`, all generated from the existing SVG mark. `index.html` adds `<link rel="apple-touch-icon">`.
- **Service worker:** `registerType: "prompt"`. Workbox pre-caches `**/*.{js,css,html,json,png,svg,webmanifest}` and ignores `standalone/**`. The largest file, the data chunk (~0.95 MB), is under Workbox's 2 MiB default limit.
- **`UpdatePrompt`:** when a new service worker is waiting, a toast shows "Update available · Reload". It never reloads on its own.
- **Installing:**
  - `beforeinstallprompt` is captured, and the menu shows **Install app**.
  - On iOS Safari outside standalone mode, the menu instead shows "Tap Share → Add to Home Screen to install. Installed apps keep saves safe from Safari's 7-day storage limit."
  - No automatic prompts.

### 7.2 Standalone single-file build

- **Build:** `vite build --mode standalone` using `vite-plugin-singlefile` ^2.3, with dynamic imports inlined and no PWA plugin.
- **Output:** `dist/standalone/index.html`, published at `https://brs8857.github.io/FM.web/standalone/`.
- **Repo cleanup:** the committed `standalone/index.html` is deleted and the README is updated.

### 7.3 Performance

| Budget | Target | Enforced by |
|---|---|---|
| App code (JS without the data chunk), gzipped | ≤ 120 KB | `scripts/check-bundle-size.mjs` in CI (fails the build) |
| Data chunk | Separate file, cached independently of app releases | Build output check in the same script |
| Lighthouse mobile performance | ≥ 90 | Manual release checklist |

`createSquadLookup` caches converted squads per `year_clubId`, so repeated spins and shortlists don't rebuild the same player objects.

### 7.4 Errors

- **`ErrorBoundary`** (around everything below `main.jsx`) shows "Something went wrong", the error message, the game version and the `careerSeed`, with three actions:
  - **Reload:** resumes from the autosave.
  - **Export save:** exports the last autosave straight from storage, without needing the crashed state. Hidden when storage is unavailable.
  - **Start new game:** moves the save to `fmweb.save.corrupt`, then starts a new game.
- **`DatasetGate`:** shows a loading screen, then on failure "Couldn't load player data. Check your connection" with a **Retry** button that runs `loadDataset()` again.
- **The reducer** returns the state unchanged for unknown or impossible actions, as it does today.

---

## 8. Bug fixes in v1.1

Numbering follows the code review. Each fix comes with a test that fails before the fix and passes after it.

| # | Bug | Fix | Test |
|---|---|---|---|
| 1 | Clubs relegated can be promoted straight back the same summer | `drawPromotedClubs` also excludes the names relegated in this transition | 200 seeded transitions: `promoted ∩ relegated = ∅` |
| 3 | The draft pool quietly offers other positions | `buildPool` returns `{ players, relaxed }`. When relaxed, the draft shows "No {positions} in {club season}. Showing the whole squad" and marks each card whose position differs from the slot. The heading no longer says "only …s". | Fixture squad without a DM: `relaxed === true`; the component shows the notice |
| 4 | The same real player can appear twice | Identity rule from §6.3, applied in draft, bench and shortlist | Fixture with one player in two seasons (excluded) and two different people sharing a name and nationality (both allowed) |
| 6 | Wrong text after season 1 | Table caption is based on the season: season 1 says "…your XI taking Fulham's place"; later seasons say "This season's 19 Premier League clubs alongside your XI". The perfect-season subtitle becomes "38 wins from 38 — a perfect season no Premier League side has ever managed." | Snapshot of the caption for seasons 1 and 2; tier text for the 38-win case |
| 7 | Touch drag-and-drop runs the drop twice | Pointer events only, plus a once-per-drop ref guard (§5.3) | Component test firing `pointerup` followed by `touchend` dispatches exactly once |
| — | Cleanup | Remove the duplicate `eraIndex`, the unused `neutralRole` and the `eslint-disable` comments (by fixing the hook dependency lists) | ESLint passes |

**Not in Phase 1:** #2 (rival points ignore your results) and #5 (no progression between seasons) are Phase 2.

---

## 9. Testing

### 9.1 Golden-master tests

- **Capture script:** `scripts/capture-golden.mjs` runs **once against the v1 engine**, `src/App.jsx` lines 3–809 (which match the live build at `6495fb8`). It loads them the same way the balance sim did.
- **Fixed inputs:** 20 XIs, drafted from the real dataset using a fixed seed, across two formations (4-3-3, 4-2-3-1).
- **Saved to `tests/golden/`:**
  - `profiles.json`: `computeFamiliarity`, `computeTeamProfile` and `tacticalReadout` for every XI × all 7 styles. These don't involve randomness.
  - `seasons.json`: `simulateSeason` for 20 seeds with `Math.random` replaced by `createRng(seed).next`.
  - `league.json`: `applyPromotionRelegation` for 20 seeded tables, using the same replacement.
- **Rules:**
  1. Rollout step 3 (engine extraction, §10) must match every golden file exactly.
  2. Step 4 (switching to an explicit random-number generator and Fisher–Yates) re-records `seasons.json` and `league.json` only, in a commit containing just that change and the new golden files, with the reason in the commit message.
  3. `profiles.json` never changes in Phase 1.
  4. Any other golden change needs its own commit that explains why, e.g. the bug #1 fix re-records `league.json`.

### 9.2 Unit and integration tests (Vitest 3.2, `jsdom` for components)

| Area | Tests |
|---|---|
| `engine/rng` | Same seed gives the same sequence. Different counters give different sequences. The shuffle doesn't modify its input. Shuffle fairness smoke test (chi-square over 10k shuffles of 5). |
| `engine/season` | Schedule is 38 rounds, each opponent played home and away once, alternating home/away. Tier boundaries. |
| `engine/players`, `squad`, `league` | Bug tests from §8. `buildPool` sorts preferred-side players first, then by rating. |
| `state/reducer` | **Career walkthrough** on `tests/fixtures/mini-dataset.json` (8 club-seasons covering every position; one without a DM; one player in two seasons; two different people sharing a name and nationality). It plays formation → draft ×11 → tactics → simulate → reveal → result → transfer through to the end of season 6, checking after **every** action: 11 slots; bench ≤ 6; no two owned players with the same identity; 19 opponents; `rngCounter` never decreases. |
| `state/save` | A save loads back exactly as written. Rejection cases: wrong app, newer version, missing fields, malformed JSON. Storage unavailable. Storage full on write. Corrupt autosave moved aside. |
| Components (React Testing Library) | Accordion opens only one section. Bottom sheet closes with Esc or the backdrop and returns focus. Chip group arrow keys. Pitch keyboard select, nudge, swap and cancel. Tap vs drag threshold. Single drop dispatch (bug #7). Relaxed-pool notice. |

### 9.3 Browser tests (`@playwright/test` ^1.63, `@axe-core/playwright` ^4.13)

- **Where they run:** against `vite preview` of the production build.
- **Browser projects:** `chromium-mobile` (Pixel 7), `webkit-mobile` (iPhone 13) and `chromium-desktop` (1280×800).
- **Tests:**
  1. **Career smoke test:** draft 11 → simulate → reveal → result → transfer → season 2 tactics. On phone projects it checks:
     - The Spin button is fully inside the viewport at every pick.
     - The sticky action bar is visible on tactics.
     - No horizontal scroll on any screen.
  2. **Save:** reload mid-tactics resumes at the same screen and season. Export, then import into a fresh browser context, gives the same state.
  3. **Offline:** wait for the service worker, go offline (`context.setOffline(true)`), reload, and the draft still works.
  4. **Accessibility:** axe on every screen, with zero `serious` or `critical` violations.
- **When each test is added:** test 1 (the flow only) lands in step 1 and test 2 in step 5; both run against the current layout. The phone layout checks in test 1 and accessibility test 4 land in step 8 and run against `layout=v2` only, until v2 becomes the default. Test 3 lands in step 10.

### 9.4 Balance simulation

`scripts/sim.mjs` (`npm run sim`) reports title and bottom-three odds by style and drafting strategy, as in the code review. It only reports in Phase 1.

### 9.5 CI

One workflow, `.github/workflows/ci.yml`, replaces `deploy.yml`:

```
check   (push + pull_request): npm ci → lint → vitest → build (app + standalone)
                                → bundle-size check → playwright (chromium + webkit)
deploy  (push to main only, needs: check): upload dist → deploy-pages
```

The standalone build and the bundle-size check join the `check` job in step 10, once the data chunk (step 2) and standalone mode exist.

---

## 10. Rollout

Each step is a small batch of commits on `main`, and every step deploys only once CI passes.

**v1.1 Foundation (Plan 1A)**

1. **Tooling.** ESLint 9 with react-hooks, Vitest, a Playwright skeleton, the new `ci.yml`, and golden files captured from v1 (§9.1).
2. **Data.** `players.json` and `championship.json`, `loadDataset`, and `DatasetGate`.
3. **Engine extraction.** Every engine module is pulled out. All golden tests pass unchanged.
4. **Seeded randomness.** `rng.js`, `takeRng`, `careerSeed`/`rngCounter`, `LAND` without payload, and Fisher–Yates. `seasons.json` and `league.json` are re-recorded.
5. **State and saves.** The `state/` modules, the player identity helper, autosave and resume, export/import, the save menu, storage-failure banners, and `ErrorBoundary`.
6. **Components split out.** No visual change.
7. **Bug fixes and cleanup** (§8). Then bump the version, write the changelog, tag **v1.1.0** and publish a GitHub release.

**v2.0 Reach & Polish (Plan 1B)**

8. **Shared UI** (§5.1) and the interaction model (§5.3), behind `?layout=v2`. Some fixes don't depend on the new layouts, so they ship to **both** layouts straight away: zoom, contrast, screen-reader labels, reduced motion and the single drop handler.
9. **Screens rebuilt one at a time** behind the flag: tactics, draft, formation, reveal, result, transfer.
10. **Installable app, offline, performance.** Manifest, icons, service worker, `UpdatePrompt`, install menu, standalone build in CI, bundle budget.
11. **Housekeeping.** `LICENSE`, a note on where the data comes from, and an updated README (installing, saves, retiring the desktop build).
12. **Release.** Complete the device checklist (§12), make v2 the default layout, delete the v1 layout code and the flag, bump the version, write the changelog, tag **v2.0.0** and publish a GitHub release.

**Layout flag.** `?layout=v2` saves `{ layout: "v2" }` to `fmweb.prefs`, and `?layout=v1` clears it. `App` chooses the screen components based on it. The flag has no effect on game state or saves.

---

## 11. Dependencies

| Package | Version | Note |
|---|---|---|
| `vite` | 5.4.x (unchanged) | Upgrading to Vite 6/7 is a separate change after v2.0, so it doesn't happen mid-refactor |
| `@vitejs/plugin-react` | 4.x (unchanged) | |
| `vite-plugin-pwa` | ^1.3 | Supports Vite 3–8 |
| `vite-plugin-singlefile` | ^2.3 | Requires Vite ≥ 5.4.21 (installed: 5.4.21) |
| `vitest` | ^3.2 | Latest (5.0) requires Vite ≥ 6.4 |
| `@testing-library/react`, `jsdom` | ^16.3, ^30 | |
| `@playwright/test`, `@axe-core/playwright` | ^1.63, ^4.13 | CI installs only Chromium and WebKit |
| `eslint`, `eslint-plugin-react-hooks` | ^9, ^7.1 | |

---

## 12. Acceptance criteria

**v1.1**
- All golden, unit, component and Playwright tests pass in CI, and deploys only happen after CI passes.
- A career survives a page refresh and a browser restart, in both Chromium and WebKit.
- Export on one browser, import on another, gives the same career.
- Bugs #1, #3, #4, #6 and #7 each have a test that failed before the fix and passes after it.
- Apart from the bug fixes and the new save and menu UI, the game looks and plays the same as v1.0.

**v2.0** (the roadmap's exit criteria, made concrete)
- **Phone checks (375×812):**
  - The Spin button is visible without scrolling at every draft pick.
  - The tactics sticky bar is always visible.
  - No horizontal scroll on any screen at widths from 320 to 1440 px.
- **Automated quality checks:**
  - axe finds zero serious or critical violations on every screen.
  - Lighthouse mobile: performance ≥ 90 and accessibility ≥ 90, and the app is installable.
  - App code stays at or under 120 KB gzipped.
- **Offline and updates:** an offline reload still plays; the update prompt appears after a new deploy.
- **The whole game works with the keyboard alone:** draft, tactics (including moving players) and saving.
- **Manual device checklist complete:**
  - Devices: real iPhone Safari (in the browser and installed), Android Chrome (installed), desktop Chrome, Edge and Firefox.
  - Career: a six-season career on the phone, with the save exported and then imported on desktop.
  - Offline and updates: airplane-mode play; the update prompt.
  - Accessibility: VoiceOver and TalkBack spot checks; reduced-motion mode.
- **The owner has played it and signed it off.**

---

## 13. Risks

| Risk | Mitigation |
|---|---|
| Extracting the engine changes results in subtle ways (e.g. floating-point order, a missed branch) | Golden files recorded from v1 before any move; step 3 has to match them exactly |
| Safari deletes saves after 7 days without a visit (not for installed apps) | Install tip in the menu, persistent-storage request, Export |
| A service worker under the `/FM.web/` subpath serves a stale or broken version | `registerType: "prompt"`, relative `scope` and `start_url`, the offline Playwright test, and a check against the live site right after deploy |
| Two layouts side by side temporarily add code | The flag only lasts through Plan 1B; the v1 layout code is deleted at v2.0 |
| The 8 px tap/drag threshold feels wrong on real devices | The threshold is a single constant; it's tested on real devices before v2.0 |
| The identity rule merges genuinely different people with the same name, nationality and birth year ±1 | Only 21 pairs in the whole dataset differ at all, and the ±1 rule matches the observed birthday drift. Accepted. |
| `navigator.canShare({ files })` isn't available (e.g. Firefox desktop) | Download fallback |

## 14. Owner decisions due before v2.0

These are part of rollout step 11. Each has a proposed default, and the owner confirms during that step.

- **Licence:** proposed MIT for the code, with the player dataset explicitly excluded from the licence.
- **Where the data comes from:** the club IDs match Transfermarkt's. Choose between keeping the dataset in the public repo as it is, or moving it out and loading it from somewhere else.
