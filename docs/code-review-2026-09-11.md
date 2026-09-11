# FM.WEB — Code Review & Repo Audit (2026-09-11)

Baseline: `main` @ `6495fb8` ("Update deploy.yml"), live at
https://brs8857.github.io/FM.web/. Line numbers refer to `src/App.jsx`.

## 1. Sync & file audit

The project was downloaded from claude.ai as a loose `files/` folder. Findings:

| Item | Finding |
|---|---|
| `fm-web-github/fm-web/` | Identical to GitHub `main` except `.gitignore` (never uploaded) and `deploy.yml` (`cache: npm` removed on GitHub). |
| Live Pages site | Byte-identical to a local `vite build` of `main` (bundle `index-DtTfGwnL.js`). |
| `FM.web.jsx`, `FM.web.html` | Exact duplicates (SHA-256) of `src/App.jsx` and `standalone/index.html`. |
| `FM.web-windows/` (Electron, ~180 MB) | Stale: pre-dates career mode — no transfers, promotion/relegation, or ratings reveal (57/74 current UI strings present). |

The loose download was archived to `../Fm.web-archive/files/`; this folder is now the git working copy.

**Missing from every copy**

- Data pipeline — `build_final.py` (referenced at line 715) and the raw squad /
  market-value source data. Without it, ratings and club strengths can't be
  regenerated or re-tuned.
- Electron desktop build source (packaging config, the build that produced `bundle.js` + `styles.css`).
- `package-lock.json` (the first Pages deploy failed on `cache: npm` because of this), `LICENSE`, tests.
- Data provenance: club IDs match Transfermarkt's. Check the source's terms, since the repo is public.

## 2. Confirmed bugs

1. **Relegated clubs can be re-promoted the same summer.** `drawPromotedClubs`
   excludes only survivors (line 797–799). Observed in simulation: Lincoln City
   and West Brom went down and straight back up in one transition.
2. **Rival points ignore the user's results** (`estimateClubPoints`, lines
   723–727, 747). The 19 rivals average 1,113 points combined, against about 990 in a real
   league. Winning every head-to-head doesn't cost them anything, and the
   median title needs 88 points.
3. **Relaxed draft pools aren't disclosed.** When a club-season has no player
   of the slot's position, `buildPool` offers the whole squad (line 234), but
   the UI still says "only Defensive Mids from this club season" (line 1767),
   so an outfielder can be put in goal. 47 squads have no DM, 145 no AM, and
   3.7% of draft picks hit this fallback.
4. **The same real player can appear twice.** Player IDs are per season-row
   (line 15), so Henry 2003 and Henry 2004 are both draftable or signable. That
   affects 2.1% of XIs drafted by best pick, and the transfer window adds more exposure.
5. **Careers don't progress.** Familiarity is recomputed from static inputs each
   season (it's identical in seasons 1–6, although the UI says systems "take time to
   click"), and players never age or develop. Signing to a full bench silently
   releases the weakest player (lines 903–911).
6. **Wrong text after season 1:** "your XI taking Fulham's place" is hard-coded
   (line 1869). The perfect-season text says "with games to spare" (line 754).
7. **Plausible, still to verify on a touch device:** both `pointerup` and `touchend` window
   listeners call the drop handler (lines 2115–2116). If both fire before
   the effect cleans up, `SWAP_PLAYERS` dispatches twice and the swap undoes itself.

## 3. Balance (Monte Carlo, 400 seasons per cell, 11,200 total)

The engine's pure functions (lines 3–809) were extracted and run headless.
"best" = always pick the highest-rated player in the pool; "random" = pick at random.

| Style | Best-pick title % | Random-pick title % | Random bottom-3 % |
|---|---|---|---|
| Low Block Counter | 88–89 | 39–57 | 0 |
| Direct & Vertical | 56 | 17–27 | 0 |
| Gegenpress | 52–53 | 14–21 | 0 |
| Wing Play | 50–53 | 16–24 | 0 |
| Possession Control | 35–46 | 2–7 | 1–2 |
| Balanced | 23–24 | 2–4 | 3 |
| Park The Bus | 4–5 | 1–2 | 4–5 |

- **Low Block Counter dominates.** With the same squad, choosing a style moves title odds from 4% to 89%.
- **Relegation almost never happens.** Ratings are per-season percentiles, so a
  randomly drafted XI still averages 79 OV. Careers have little tension.
- **Hidden ratings leak.** The six stat pips show their numbers on the tactics
  board (line 1418) and on transfer cards (line 1950).

## 4. Architecture & maintainability

- A single 2,316-line file, 88% of it two data lines (the `DATASET` literal on line 7 is
  940 KB). Data, engine, reducer, about 20 components and CSS all live together.
- No persistence: a refresh loses a six-season career.
- No tests, although the engine is pure and easy to test.
- Biased shuffles `sort(() => Math.random() - 0.5)` (lines 730, 785, 870, 878), and
  no seeded RNG, so runs can't be reproduced or shared.
- A 1.16 MB JS bundle (313 KB gzip), with the data compiled into the code.
- `standalone/index.html` is a manually built artifact committed to the repo, so it will drift.
- Minor: `eraIndex` is computed twice (lines 1715, 2131); `neutralRole` is unused (line
  1403); inline `style={{ display: "flex" }}` is mixed with Tailwind, left over
  from the artifact renderer.
- Accessibility: `user-scalable=no` blocks zoom; player positioning is drag-only
  with no keyboard path; the selected style card uses `text-neutral-900` on
  `emerald-600`.
