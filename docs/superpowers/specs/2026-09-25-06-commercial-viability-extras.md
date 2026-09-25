# Spec 6: Everything else before a commercial release

| | |
|---|---|
| **Status** | Draft for owner review, 2026-09-25 |
| **Date** | 2026-09-25 |
| **Series** | 6 of 6 |
| **Baseline** | `main` @ `8b3fc57` (v1.1.0) |
| **Inputs** | [02](2026-09-25-02-gap-analysis.md) severity-A gaps, [05](2026-09-25-05-commercial-readiness.md), [code review 2026-09-11](../../code-review-2026-09-11.md) |
| **Plan** | [2026-09-25-redesign-and-app-store.md](../plans/2026-09-25-redesign-and-app-store.md) |

Things not covered by 01–05 that affect whether people would pay for
this and keep playing it. Each section ends with a recommendation and,
where relevant, an owner decision.

---

## 1. The blocker: the career has to be worth paying for

The free/paid boundary in 05 §4 puts the *career* behind the purchase.
Today the career is six replays of season one (02 G6): no ageing, no
cohesion growth, five free random signings, a table whose other 19 rows
are estimates (code review bug #2), and one style that wins the title
88% of the time (bug #3 in the review's balance table). A buyer who pays
after season one would discover all of this in season two.

The roadmap puts these in Phase 2 (v3.0). For a paid release, a subset
has to move ahead of the App Store milestone:

| From Phase 2 | Why it gates the purchase | Cost |
|---|---|---|
| A real league: all 20 clubs play every fixture | The table is the season's scoreboard; an estimated one undermines the verdict | Medium: `engine/season.js` gains a full round-robin sim; the golden `seasons.json` re-records with reason |
| Ageing and development | Season two must differ from season one; ageing is the cheapest way for the squad to change under the player | Low-medium: a per-season `progressPlayer(player, rng)` in `engine/players.js`; applied in `CONTINUE_SEASON` |
| Cohesion grows with time in a system and drops on change | The UI already promises it | Low: a `cohesionMemory` field; `computeFamiliarity` adds a bonus from seasons-in-system |
| Style rebalance to a target spread, checked by `npm run sim` in CI with thresholds | "One right answer" kills replay (01 L3) | Medium: tuning `identitySynergy` and preset values; the sim already exists |
| Transfer window with a constraint (a budget in abstract points, or a fixed number of signings with scarcity) | Five free signings is not a decision | Low-medium |

Not moved: relegation of the player's own club, open-ended careers,
opponent styles/matchups, difficulty levels (still Phase 2).

**Recommendation (owner decision X1):** re-sequence so that this subset
("Career depth, part 1") ships as **v2.5** between the redesign (v2.0)
and the App Store release (v3.0). Details in the plan, milestone C.

---

## 2. Telemetry and analytics

**v1: none.** Reasons: guideline 5.1.1(ii) requires consent for usage
data even if anonymous (05 §6); the Privacy Nutrition Label can then say
"Data Not Collected", which is itself a selling point for this genre; and
App Store Connect already provides opt-in install, retention and crash
metrics from users who share analytics with developers at the OS level.

**If added later**, the options that avoid App Tracking Transparency
(they don't track across apps or link to a user):

- **TelemetryDeck**: Apple-first, JS SDK available, free to 100k signals/month, needs no ATT prompt for anonymous signals. ([comparison](https://theswiftk.it.com/best/best-ios-analytics-sdks))
- **Aptabase**: open source, self-hostable, JS and Tauri SDKs, free to 20k events/month. ([Aptabase](https://toolradar.com/tools/aptabase))

Either would be wired through `src/platform/telemetry.js`, **opt-in from
Settings, default off**, with the events limited to: career started,
season completed (season number, tier, identity), purchase completed,
crash. No identifiers beyond a per-install random ID that the user can
reset. Adding it changes the privacy label ("Usage Data · not linked to
you") and the policy.

**Balance telemetry** (the Slay the Spire lesson, 01 §3) is better served
offline: `scripts/sim.mjs` with thresholds in CI, plus a Settings toggle
"Include a diagnostics slip when sharing" that appends the career code and
style to the share image so the owner can read real careers from social
posts without collecting anything.

**Owner decision X2:** no analytics in v1; revisit after the first month
of App Store Connect data.

---

## 3. Localisation

The dataset is proper nouns; the UI is around 400 strings after the
redesign. Structure for it now, translate later:

- All UI strings through `t(key, vars)` from `src/content/strings/en-GB.json`; ICU plural syntax for "1 centre-back / 2 centre-backs".
- Dates and numbers through `Intl`.
- Term definitions (`content/terms.json`) and coach's notes keyed the same way.
- Layouts tested with a pseudo-locale that lengthens strings by 40% (German is the realistic worst case).

First target languages if the game finds an audience: **es, pt-BR, de,
it, fr** — the largest football-management markets outside English. Each
is roughly a day of translation plus a review by a football-literate
speaker (role names are the hard part). App Store metadata localisation
can go first (cheap, affects discovery).

**Owner decision X3:** en-GB only at launch; strings externalised in the
redesign so a second language is a data change.

---

## 4. Retention without dark patterns

Mechanics that respect 01 E1–E2 and reuse what exists:

1. **Today's draw** — a seed derived from the date (`hash(YYYY-MM-DD)`) seeds a one-season run with a fixed era; everyone gets the same club-seasons. Shareable back page with the code. No server; "compare" means a screenshot. Needs only the career-code work from 04 §5.7. Free-tier eligible? Default **paid** (it's the strongest reason to buy), but the *first* daily of each week is free (owner decision X4).
2. **Challenge modifiers** at New career (01 P2, ZenGM's precedent): era-locked (one decade), one club (every pick from one club's history), no redraws, budget XI (a points cap on the reveal), blind board (no strengths bars). Each is a flag in state that the reducer or selectors read; no engine change except the budget cap, which is a draft-time filter.
3. **The record book** (04 §5.7): best finish, titles, unbeaten seasons, longest career, per-modifier bests. This is the meta-loop (01 L2).
4. **Nothing time-limited.** No streaks, no daily rewards, no notifications in v1.

## 5. Distribution channels

| Channel | Role | Recommendation |
|---|---|---|
| App Store (iOS) | The paid product | v3.0 |
| GitHub Pages + PWA | Free tier, marketing, the itch of "try it in the browser" | Keep; link from the listing and from the standalone file |
| `standalone/index.html` | Offline free tier for people who like single files | Keep building it in CI; retire the hand-committed copy (Phase 1 spec §7.2) |
| itch.io | (a) the free web tier as a page, for discovery among management-sim players; (b) later, a **paid downloadable/web full build** for desktop players who won't buy on iOS. itch supports paid HTML5 games and takes a developer-set share (default 10%) | (a) at v2.0; (b) only if asked for. Paid itch build is a separate unlock from the App Store one (05 §7) |
| Google Play | Same Capacitor project; Play's small-developer rate is 15% | After iOS is stable (05 A10) |
| Steam | Would need a desktop shell (Tauri desktop or Electron) and a $100 listing fee; the game's session shape doesn't need it | Not planned |

## 6. Privacy policy outline

Hosted at the Pages site (`/privacy`), linked from the listing and Club →
About. Sections: who we are; what the app stores on your device (careers,
preferences); iCloud (your Apple ID's key-value store, controlled by
you, off by default until v1.1); purchases (processed by Apple; we
receive no personal data); analytics (none; if enabled in future,
opt-in); children (no data collected; not directed at children); your
rights (delete the app to delete everything; contact address); changes.
Reviewed when 05 A7 or X2 change.

## 7. Items from the 2026-09-11 code review that block commercial quality

| Review item | Status | Where it's handled |
|---|---|---|
| §1 Data pipeline `build_final.py` missing | Open. Ratings can't be regenerated; the rights review (03 §5) needs to know what was pulled | Plan task C0: recover or rebuild; at minimum document the derivation and replace Transfermarkt IDs |
| §1 Data provenance / Transfermarkt terms | Open, **release blocker** | 03 §5, owner action |
| §1 `LICENSE` missing | Open | Plan task B7 (MIT, dataset excluded) |
| §2 bug #2 rival points ignore results | Open | §1 above (real league), milestone C |
| §2 bug #5 no progression | Open | §1 above, milestone C |
| §3 balance: Low Block Counter 88% | Open | §1 above, sim thresholds in CI |
| §3 hidden ratings leak via pips | Open | 04 U3 |
| §3 relegation almost never happens (avg random XI 79 OV) | Open; part of balance | Milestone C, tune `compress` thresholds against the real league |
| §4 no persistence, tests, seeded RNG, split | Done in v1.1 | — |
| §4 zoom lock, drag-only, contrast | Open | 04 §8 |
| §4 inline styles, `standalone/` drift | Open | 04 (rebuild), Phase 1 spec §7.2 |

## 8. Release checklist additions (beyond the Phase 1 device checklist)

- TestFlight external beta with at least 20 testers for two weeks; the season-one → purchase → season-two path exercised on iOS 15, 17 and 26.
- Restore purchases tested on a second device with the same Apple ID and on a device with a different Apple ID (must not unlock).
- Reinstall test: autosave survives via Preferences; iCloud KVS (when shipped) restores on a wiped device.
- Screenshots (6.7", 6.1", iPad 13") from the actual build, no competitor names, no "Premier League".
- App Review notes: explain that the draw is random with no wager or purchase, that the app is fully offline, and where the Restore button is.
- Rights review (03 §5) signed off; privacy policy live; `LICENSE` in the repo.
- `npm run sim` thresholds green; the six-season career playable by keyboard and VoiceOver.

## 9. Owner decisions

| # | Decision | Default |
|---|---|---|
| X1 | Move "Career depth, part 1" (§1) ahead of the App Store release | Yes, as v2.5 |
| X2 | Analytics | None in v1 |
| X3 | Localisation | en-GB at launch, strings externalised now |
| X4 | Daily draw in the free tier | First daily each week free, rest paid |
| X5 | itch.io | Free tier page at v2.0; paid build only on demand |
