# FM.WEB

Football Manager, in your browser. Draft a Premier League dream XI from any
era between 1992-93 and 2024-25, build a real tactical system (roles,
duties, free player positioning, team instructions), and play through a
multi-season career — 2026-27 through 2031-32 — complete with a transfer
window between seasons and real promotion/relegation with the actual 2026-27
EFL Championship clubs.

Everything runs entirely client-side. There's no backend, no database, no
API calls — the full player database (every Premier League club-season from
1992 to 2024) is baked into the app at build time.

## Quickest way to try it — zero setup

Open `standalone/index.html` directly in a browser (just double-click it).
It's a single self-contained file with React, the game, and all its styling
already bundled in — no install, no server, works offline. This is the
fastest way to just try the game out.

`standalone/index.html` is still the v1.0 build; it will be regenerated
automatically in v2.0.

## Running the real dev project

This is a normal [Vite](https://vitejs.dev) + React project, so if you want
to actually work on the code:

```bash
npm install
npm run dev
```

Then open the local URL Vite prints (typically `http://localhost:5173`).

To build a production version:

```bash
npm run build
npm run preview   # sanity-check the production build locally
```

The build output goes to `dist/`.

## Checks

```bash
npm run lint      # ESLint, zero warnings allowed
npm test          # Vitest unit, component and golden-master tests
npm run e2e       # Playwright (first run: npx playwright install chromium webkit)
npm run sim       # balance report (title / relegation odds by style)
```

Careers autosave in the browser. Use **Menu → Export save** to back one up or move it to another device.

## Deploying to GitHub Pages

**Automatic (recommended):** this repo already includes a GitHub Actions
workflow at `.github/workflows/ci.yml`. Once you push it to GitHub:

1. Go to your repo's **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Push to `main` (or run the workflow manually from the **Actions** tab).

The workflow builds the project and publishes `dist/` automatically. Your
game will be live at `https://<your-username>.github.io/<repo-name>/`.

**Manual alternative:** you can skip the Actions workflow entirely and just
publish `standalone/index.html` as your site — rename a copy of it to
`index.html` at your repo root, enable Pages pointing at the root of `main`,
and you're done with no build step at all.

## Project structure

```
src/
├── data/          # player dataset + Championship pool (JSON, loaded on demand)
├── engine/        # pure game logic: tactics, familiarity, simulation, league, squad, rng
├── state/         # reducer, save format, autosave, export/import
├── components/    # ui/, pitch/, screens/, app/ (error boundary, save menu, loading gate)
├── App.jsx        # header and screen switching
└── main.jsx       # entry point
scripts/           # golden-master capture, balance report, one-off data extraction
tests/             # fixtures, golden files, unit and Playwright tests
```

## Notes on the data

Player ratings (overall + pace/shooting/passing/dribbling/defending/physical)
are engineered from each player's real market value (inflation-adjusted by
comparing it to their own season's league-wide distribution, not a fixed
multiplier) and age-in-that-season, blended with a position-archetype
profile. There's no gameplay-ratings dataset for football like this
publicly, so this formula — documented in comments throughout `App.jsx` — is
a transparent, tunable stand-in.

Opponent club strength (both the 19 real 2025-26-derived Premier League
rivals and the 24 real 2026-27 Championship clubs used for promotion) is
similarly derived from real historical squad data where available, with a
documented fallback for clubs with no Premier League history in the dataset.

## License

No license has been set — add one (e.g. MIT) if you plan to share this
publicly.
