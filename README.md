# Era XI

Draft an XI from 33 years of the English top flight, one club-season at a
time, with the ratings hidden until kick-off. Then build a tactic on the
chalkboard and play a six-season career, with a transfer window between
seasons and real promotion and relegation.

Everything runs in the browser. There is no backend, no account and no
tracking: the whole archive (every top-flight club-season from 1992-93 to
2024-25) ships with the app, and your career saves itself on your device.

## Playing it

The live build is at https://brs8857.github.io/FM.web/. It installs as an
app from the browser (Chrome and Edge offer **Install app** under Settings;
on iPhone use Share → Add to Home Screen) and works offline once it has
loaded.

For a single file that runs from disk, `npm run build:standalone` writes
`dist/standalone/index.html`; double-click it in any modern browser.

**How a career goes.** Choose an era and a shape. Each pick draws three
club-seasons from that era; open a cutting to see its team sheet in shirt
order and pick one player. Two redraws per draft. When the eleven are in,
set a style and the dials on the Board and kick off. The season is played a
match at a time, a report after each (or run on the vidiprinter with Play
to…); then read the back page and open the window. Six seasons
make a career; the Club tab keeps the record and your career code, which
anyone can start from to get the same draws.

## Working on it

A [Vite](https://vitejs.dev) + React project, Node 24.

```bash
npm install
npm run dev              # http://localhost:5173
npm run build            # dist/, with the service worker and manifest
npm run build:standalone # dist/standalone/index.html, one self-contained file
npm run preview          # serve dist/ locally
```

Checks, all of which CI runs before a deploy:

```bash
npm run lint             # ESLint, zero warnings allowed
npm run check:contrast   # every token pair meets WCAG AA in both themes
npm test                 # Vitest: unit, component, golden-master and axe checks
npm run check:bundle     # app code ≤ 120 KB gzipped, data chunk separate
npm run e2e              # Playwright on Pixel 7, iPhone 13 and desktop Chrome
                         # (first run: npx playwright install chromium webkit)
npm run sim              # balance report: title and relegation odds by style
npm run data:check       # rebuilds the club-strength fields from the squads and diffs them
```

Visual snapshots are opt-in: `VISUAL=1 npx playwright test --update-snapshots`
writes them under `tests/e2e/__snapshots__` on a real browser.

## Project structure

```
src/
├── data/        # the archive and promotion pool (JSON, loaded on demand)
├── engine/      # pure game logic: tactics, cohesion, simulation, league, squad, rng
├── state/       # reducer, save format and migrations, prefs, export/import
├── content/     # vocabulary, term sheets, coach's notes, strings, club names and colours
├── styles/      # design tokens, base styles, bundled fonts
├── ui/          # the primitive library (buttons, sheets, dials, ticker…)
├── pitch/       # the chalkboard: markers, bench rail, drag and keyboard models
├── screens/     # Home, New career, Draft, Squad, Board, Season, Club
└── app/         # shell, navigation, autosave, share, career codes, first run
scripts/         # icons, bundle budget, contrast check, club rekey, golden capture, balance sim, data rebuild
tests/           # fixtures, golden files, unit and Playwright tests
docs/            # roadmap, specs, plans, data notes
```

The dependency rule is `data ← engine ← state ← screens ← app`; the engine
never imports React and `Math.random` is banned outside cosmetic code, so a
career replays exactly from its seed.

## Saves

Careers autosave after every pick and every season. **Club → Saves** (or
**Saves** on the home screen) exports a `.json` you can import on another
device. Saves from 1.1.0 load and are migrated on the way in.

## Data

See [docs/data.md](docs/data.md) for what the dataset holds, how the
ratings were derived and how club identifiers work. Ratings are estimates
engineered from public market-value and age records, not official numbers.

## Licence

The code is MIT (see `LICENSE`). The dataset is not covered by that licence;
the fonts are under the SIL Open Font License.
