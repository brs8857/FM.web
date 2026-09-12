# Phase 1A Foundation Implementation Plan (v1.1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the single 2,316-line `src/App.jsx` into tested data / engine / state / component modules with seeded randomness, autosave and export/import, plus the five non-design bug fixes, and ship it as v1.1 without changing how the game plays.

**Architecture:** Work step by step on `main`; every task leaves the game building, passing CI and deployable. Golden-master files recorded from the v1 engine (commit `6495fb8`) guard every move. Data moves to lazily loaded JSON, pure engine modules take a dataset lookup and an explicit `rng`, and the reducer becomes `createReducer(dataset)` with a career seed and counter stored in state.

**Tech Stack:** React 18.3, Vite 5.4, Tailwind 3.4, Vitest 3.2 + jsdom 30 + React Testing Library 16, Playwright 1.63, ESLint 9 (+ eslint-plugin-react, eslint-plugin-react-hooks), GitHub Actions + Pages.

**Spec:** [docs/superpowers/specs/2026-09-11-phase-1-design.md](../specs/2026-09-11-phase-1-design.md) (rollout steps 1–7). Read it before starting.

## Global Constraints

- Node **24** in CI and locally (jsdom 30 requires Node ^22.22.2 or ^24.15.0; Node 20 is end-of-life).
- Stay on **Vite 5.4.x** and `@vitejs/plugin-react` 4.x. No TypeScript. No new runtime dependencies.
- Dev dependencies allowed in Plan 1A: `eslint@^9.39`, `eslint-plugin-react@^7.37`, `eslint-plugin-react-hooks@^7.1`, `globals@^17`, `vitest@^3.2`, `jsdom@^30`, `@testing-library/react@^16.3`, `@testing-library/dom@^10.4`, `@playwright/test@^1.63`. (`eslint-plugin-react` is needed because core `no-unused-vars` otherwise reports components used only in JSX.)
- **Game rules and tuning must not change.** `tests/golden/profiles.json` never changes in Phase 1. `seasons.json` / `league.json` change only in Task 10 (randomness switch) and Task 22 (bug #1), each in its own commit explaining why. Task 25 re-records them too, but only in the unlikely case that a re-recorded season reaches 38 wins (the captured seasons peak at 33).
- Dependency rule: `data ← engine ← state ← components ← App`. `src/engine/**` and `src/state/**` never import React. From Task 10 on, `Math.random` is banned everywhere except `WheelSpinner`'s cosmetic flicker.
- Storage keys exactly: `fmweb.save`, `fmweb.save.corrupt`, `fmweb.prefs`. Save envelope exactly `{ app: "fm-web", saveVersion: 1, gameVersion, savedAt, state }`.
- Repo files use LF (`.gitattributes`). Scripts that read files by line must normalise `\r\n` anyway, because existing Windows working copies may still be CRLF.
- Golden comparisons go through `JSON.parse(JSON.stringify(x))` first: Vitest's `toEqual` treats `-0` and `0` as different.
- jsdom 30 lacks `document.elementFromPoint`, `navigator.storage`, `navigator.canShare`, `window.matchMedia`, `ResizeObserver`, `URL.createObjectURL` and `Element.prototype.scrollIntoView`. Tests stub what they use (see `tests/setup.js`).
- Every commit message ends with the trailer `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- After each task: `npm run lint` (0 errors), `npm test`, `npm run build` pass. After tasks that touch UI: `npm run e2e` passes.

## File Map

| Path | Created in | Responsibility |
|---|---|---|
| `.gitattributes`, `eslint.config.js`, `tests/setup.js` | Task 1 | LF normalisation, lint rules, test environment stubs |
| `.github/workflows/ci.yml` (replaces `deploy.yml`) | Task 1, extended in 3 | Lint, unit tests, build, e2e, then Pages deploy on `main` |
| `scripts/capture-golden.mjs`, `tests/golden/*.json` | Task 2, extended in 10 | Record engine outputs (v1 source or new engine) |
| `playwright.config.js`, `tests/e2e/*` | Task 3, extended in 16 | Browser smoke and save tests |
| `scripts/extract-data.mjs`, `src/data/*` | Task 4 | Data JSON files and `loadDataset` |
| `src/components/app/DatasetGate.jsx` | Task 4 | Loading / error / retry screen |
| `src/engine/util.js`, `formations.js`, `roles.js`, `instructions.js`, `players.js` | Task 5 | Constants, helpers, squad lookup, draft pools |
| `src/engine/tactics.js`, `familiarity.js`, `readout.js` | Task 6 | Team profile, familiarity, tactical readout |
| `src/engine/match.js`, `season.js`, `league.js` | Task 7 | Match and season simulation, promotion/relegation |
| `src/engine/squad.js` | Task 8 | Bench fill, shortlist, signings |
| `src/engine/rng.js` | Task 9 | Seeded generator, Fisher–Yates |
| `src/state/initialState.js`, `reducer.js`, `selectors.js` | Task 11 | Game state and reducer |
| `src/state/rngState.js` | Task 12 | `takeRng`, `newCareerSeed` |
| `src/engine/identity.js` | Task 13 | Same-real-player rule |
| `src/state/save.js` | Task 14 | Serialise, validate, migrate |
| `src/state/storage.js`, `src/state/useAutosave.js`, `src/components/app/ResumeCard.jsx`, `StorageBanner.jsx` | Task 15 | Autosave, resume, storage failures |
| `src/state/exportImport.js`, `src/components/app/SaveMenu.jsx` | Task 16 | Export / import |
| `src/components/app/ErrorBoundary.jsx` | Task 17 | Crash screen |
| `src/components/ui/*`, `pitch/*`, `screens/*` | Tasks 18–20 | Components split out of `App.jsx` |
| `src/index.css`, `src/App.jsx` | Task 21 | Styles moved out; App becomes a shell |
| `src/version.js` | Task 14 | App version from package.json, injected by Vite |
| `scripts/sim.mjs` | Task 27 | Balance report (`npm run sim`) |
| `CHANGELOG.md` | Task 29 | Release notes |

---

### Task 1: Lint, test runner and CI

**Files:**
- Create: `.gitattributes`, `eslint.config.js`, `tests/setup.js`, `tests/unit/tooling.test.js`, `.github/workflows/ci.yml`
- Modify: `package.json`, `vite.config.js`, `.gitignore`
- Delete: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: nothing.
- Produces: `npm run lint`, `npm test` (Vitest, jsdom by default, `// @vitest-environment node` per file for pure tests), `tests/setup.js` stubs, CI jobs `check` and `deploy`.

- [ ] **Step 1: Install dev dependencies**

```bash
npm i -D eslint@^9.39 eslint-plugin-react@^7.37 eslint-plugin-react-hooks@^7.1 globals@^17 vitest@^3.2 jsdom@^30 @testing-library/react@^16.3 @testing-library/dom@^10.4
```

- [ ] **Step 2: Write the failing tooling test**

`tests/unit/tooling.test.js`:

```js
// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("tooling", () => {
  it("parses JSON data as JSON.parse and keeps relative asset paths", async () => {
    const { default: config } = await import("../../vite.config.js");
    expect(config.base).toBe("./");
    expect(config.json).toEqual({ stringify: true });
  });

  it("normalises line endings to LF", () => {
    expect(readFileSync(".gitattributes", "utf8")).toMatch(/^\* text=auto eol=lf$/m);
  });
});
```

- [ ] **Step 3: Add scripts and Vitest config, run the test to verify it fails**

`package.json` `scripts` becomes:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "lint": "eslint .",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

`vite.config.js` (JSON option deliberately not added yet):

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" keeps asset paths relative so the build works under the
// GitHub Pages project path (https://brs8857.github.io/FM.web/).
export default defineConfig({
  plugins: [react()],
  base: "./",
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{js,jsx}", "tests/unit/**/*.test.{js,jsx}"],
    setupFiles: ["tests/setup.js"],
  },
});
```

`tests/setup.js`:

```js
import { afterEach } from "vitest";

if (typeof window !== "undefined") {
  const { cleanup } = await import("@testing-library/react");
  afterEach(cleanup);
  // jsdom 30 does not implement these; components call them.
  Element.prototype.scrollIntoView ||= function scrollIntoView() {};
  window.matchMedia ||= (query) => ({
    matches: false, media: query, onchange: null,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent() { return false; },
  });
}
```

Run: `npm test`
Expected: FAIL — `expected undefined to deeply equal { stringify: true }` and `ENOENT ... .gitattributes`.

- [ ] **Step 4: Implement config**

Add `json: { stringify: true },` after `base: "./",` in `vite.config.js`.

`.gitattributes`:

```
* text=auto eol=lf
*.png binary
*.ico binary
```

`eslint.config.js`:

```js
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  { ignores: ["dist/**", "standalone/**", "coverage/**", "playwright-report/**", "test-results/**", "tests/golden/**", "src/data/**"] },
  {
    files: ["**/*.{js,jsx,mjs}"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react, "react-hooks": reactHooks },
    settings: { react: { version: "18.3" } },
    rules: {
      "no-undef": "error",
      // Raised to "error" in Task 28 once the four known leftovers are removed.
      "no-unused-vars": "warn",
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    files: ["src/engine/**/*.js", "src/state/**/*.js"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{ group: ["react", "react-dom", "react/*", "react-dom/*"], message: "engine/ and state/ must not import React." }],
      }],
    },
  },
];
```

Note: the react-hooks v7 `recommended` preset is intentionally **not** used; it adds React Compiler rules (e.g. `set-state-in-effect`) that fail on the current `WheelSpinner` and `ResultCard`.

Append to `.gitignore`:

```
coverage
playwright-report
test-results
```

- [ ] **Step 5: Run tests and lint to verify they pass**

Run: `npm test`
Expected: PASS, 2 tests.

Run: `npm run lint`
Expected: `0 errors`, 4 warnings, all `no-unused-vars` — `foc` (App.jsx:475), `neutralRole` (1403), `formationKey` (1714), `draftedIds` (2069).

Run: `git add --renormalize . && git status --short`
Expected: only the files changed in this task (the index already stores LF).

- [ ] **Step 6: Replace the workflow**

Delete `.github/workflows/deploy.yml`. Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: ["main"]
  pull_request:
  workflow_dispatch:

permissions:
  contents: read

jobs:
  check:
    runs-on: ubuntu-latest
    concurrency:
      group: check-${{ github.ref }}
      cancel-in-progress: true
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist

  deploy:
    if: github.ref == 'refs/heads/main' && github.event_name != 'pull_request'
    needs: check
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    concurrency:
      group: pages
      cancel-in-progress: false
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 7: Verify the build and commit**

Run: `npm run build`
Expected: `✓ built`, bundle `assets/index-*.js` ≈ 1,158 kB (unchanged behaviour).

```bash
git add .gitattributes eslint.config.js tests/setup.js tests/unit/tooling.test.js .github/workflows/ci.yml .github/workflows/deploy.yml package.json package-lock.json vite.config.js .gitignore
git commit -m "Add ESLint, Vitest and CI workflow" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

After pushing: confirm the `CI` run on GitHub shows `check` and `deploy` both green, and https://brs8857.github.io/FM.web/ still loads.

---

### Task 2: Capture golden-master files from the v1 engine

**Files:**
- Create: `scripts/capture-golden.mjs`, `tests/golden/xis.json`, `tests/golden/profiles.json`, `tests/golden/seasons.json`, `tests/golden/league.json`, `tests/golden/README.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: git history (`6495fb8:src/App.jsx`).
- Produces: `tests/golden/xis.json` — `Array<{ formationKey: string, assignments: Assignment[] }>` (20 entries; each assignment has `player`, `role` **object**, `duty`, `pos`, sliders); `profiles.json` — `Array<{ xiIndex, style, familiarity, profile, readout }>` (140); `seasons.json` — `Array<{ seed, xiIndex, style, familiarity, profile, result }>` (20); `league.json` — `Array<{ seed, table, result: { opponents, relegated, promoted } }>` (20). Also `mulberry32(seed)` exported from the script for Task 7's shim.

- [ ] **Step 1: Write the capture script**

`scripts/capture-golden.mjs`:

```js
// Records engine outputs as golden-master files.
//   node scripts/capture-golden.mjs            -> all four files from the v1 source (6495fb8)
// Task 10 adds an --engine mode that re-records seasons/league from src/engine.
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

export const V1_COMMIT = "6495fb8";

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function withSeededMathRandom(seed, fn) {
  const original = Math.random;
  Math.random = mulberry32(seed);
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

function loadV1Engine(repoDir) {
  const source = execSync(`git show ${V1_COMMIT}:src/App.jsx`, { cwd: repoDir, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  if (!lines[803].startsWith("function makeInitialAssignments")) {
    throw new Error("Unexpected v1 layout at line 804: " + lines[803].slice(0, 40));
  }
  const body = lines.slice(2, 809).join("\n"); // lines 3-809: data, constants and pure engine functions
  const names = ["DATASET", "STYLE_PRESETS", "buildPool", "defaultRoleFor", "defaultDutyFor", "computeFamiliarity",
    "computeTeamProfile", "tacticalReadout", "simulateSeason", "applyPromotionRelegation", "makeInitialAssignments"];
  return new Function(`${body}\nreturn { ${names.join(", ")} };`)();
}

function draftXIs(E) {
  const xis = [];
  for (const formationKey of ["4-3-3", "4-2-3-1"]) {
    for (let i = 0; i < 10; i++) {
      const rand = mulberry32(5000 + xis.length);
      const drafted = new Set();
      const assignments = E.makeInitialAssignments(formationKey).map((slot) => {
        const entry = E.DATASET.index[Math.floor(rand() * E.DATASET.index.length)];
        const pool = E.buildPool(entry.y, entry.c, slot.type, slot.side, drafted);
        const player = pool[Math.floor(rand() * pool.length)];
        drafted.add(player.id);
        const role = E.defaultRoleFor(slot.type);
        return { ...slot, player, role, duty: E.defaultDutyFor(role) };
      });
      xis.push({ formationKey, assignments });
    }
  }
  return xis;
}

export function captureProfiles(E, xis) {
  const profiles = [];
  xis.forEach((xi, xiIndex) => {
    for (const style of E.STYLE_PRESETS) {
      const familiarity = E.computeFamiliarity(xi.assignments, style.instructions, xi.formationKey);
      const profile = E.computeTeamProfile(xi.assignments, style.instructions, familiarity);
      const readout = E.tacticalReadout(profile, style.instructions, familiarity);
      profiles.push({ xiIndex, style: style.key, familiarity, profile, readout });
    }
  });
  return profiles;
}

export function seasonInputs(E, xis) {
  const inputs = [];
  for (let seed = 1; seed <= 20; seed++) {
    const xiIndex = (seed - 1) % xis.length;
    const style = E.STYLE_PRESETS[(seed - 1) % E.STYLE_PRESETS.length];
    const xi = xis[xiIndex];
    const familiarity = E.computeFamiliarity(xi.assignments, style.instructions, xi.formationKey);
    const profile = E.computeTeamProfile(xi.assignments, style.instructions, familiarity);
    inputs.push({ seed, xiIndex, style: style.key, familiarity, profile });
  }
  return inputs;
}

function writeGolden(outDir, files) {
  mkdirSync(outDir, { recursive: true });
  for (const [name, data] of Object.entries(files)) {
    const text = JSON.stringify(data, null, 1) + "\n";
    writeFileSync(join(outDir, name), text);
    const hash = createHash("sha256").update(text).digest("hex").slice(0, 16);
    console.log(name.padEnd(14), String(text.length).padStart(9), "bytes", hash);
  }
}

function main() {
  const args = process.argv.slice(2);
  const outIndex = args.indexOf("--out");
  const outDir = outIndex >= 0 ? args[outIndex + 1] : "tests/golden";
  const E = loadV1Engine(process.cwd());
  const xis = draftXIs(E);
  const profiles = captureProfiles(E, xis);
  const seasons = seasonInputs(E, xis).map((input) => ({
    ...input,
    result: withSeededMathRandom(input.seed, () => E.simulateSeason(input.profile, input.familiarity, E.DATASET.opponents)),
  }));
  const league = seasons.map((s) => ({
    seed: 1000 + s.seed,
    table: s.result.table,
    result: withSeededMathRandom(1000 + s.seed, () => E.applyPromotionRelegation(E.DATASET.opponents, s.result.table)),
  }));
  writeGolden(outDir, { "xis.json": xis, "profiles.json": profiles, "seasons.json": seasons, "league.json": league });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
```

- [ ] **Step 2: Run the capture and verify determinism**

Add script `"golden:capture": "node scripts/capture-golden.mjs"` to `package.json`.

Run:

```bash
npm run golden:capture
node scripts/capture-golden.mjs --out test-results/golden-check
git diff --no-index --stat tests/golden test-results/golden-check
```

Expected: capture prints four files (≈198 KB, 110 KB, 158 KB, 109 KB); `git diff --no-index` prints nothing (identical runs). Season `position` values across the 20 seeds span 1st to 19th.

- [ ] **Step 3: Document the rules**

`tests/golden/README.md`:

```markdown
# Golden-master files

Recorded by `scripts/capture-golden.mjs` from the v1 engine (`6495fb8`).
They prove the refactor doesn't change the game.

- `xis.json` — 20 seeded XIs (inputs). Never changes.
- `profiles.json` — familiarity, team profile and readout for every XI × 7 styles. **Never changes in Phase 1.**
- `seasons.json`, `league.json` — seeded season simulations and promotion/relegation.
  Re-recorded only by Task 10 (explicit rng + Fisher–Yates) and Task 22 (bug #1),
  each in a commit containing just the regenerated files and the responsible change.

Compare through `JSON.parse(JSON.stringify(value))` — `toEqual` distinguishes `-0` from `0`.
```

- [ ] **Step 4: Commit**

```bash
git add scripts/capture-golden.mjs tests/golden package.json
git commit -m "Record golden-master engine outputs from v1" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Playwright smoke test

**Files:**
- Create: `playwright.config.js`, `tests/e2e/helpers.js`, `tests/e2e/career-smoke.spec.js`
- Modify: `package.json`, `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: the running app (`vite preview` on port 4173).
- Produces: `draftFullXI(page)`, `playSeasonToTransfer(page)` in `tests/e2e/helpers.js` (reused in Task 16); `npm run e2e`.

- [ ] **Step 1: Install and configure**

```bash
npm i -D @playwright/test@^1.63
npx playwright install chromium webkit
```

Add script `"e2e": "playwright test"`.

`playwright.config.js`:

```js
import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://localhost:${PORT}/`, trace: "retain-on-failure" },
  webServer: {
    // CI builds in an earlier step; locally build first.
    command: process.env.CI
      ? `npx vite preview --port ${PORT} --strictPort`
      : `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    { name: "chromium-mobile", use: { ...devices["Pixel 7"] } },
    { name: "webkit-mobile", use: { ...devices["iPhone 13"] } },
    { name: "chromium-desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
  ],
});
```

- [ ] **Step 2: Write the helpers and the smoke test**

`tests/e2e/helpers.js`:

```js
import { expect } from "@playwright/test";

export async function draftFullXI(page) {
  await page.getByRole("button", { name: /Start the draft/ }).click();
  for (let pick = 0; pick < 11; pick++) {
    await page.getByRole("button", { name: /Spin the wheel/ }).click();
    const firstCard = page.getByRole("button", { name: /Age / }).first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });
    await firstCard.click();
  }
  await page.getByRole("button", { name: /Go to Tactics/ }).click();
}

export async function playSeasonToTransfer(page, season = 1) {
  await page.getByRole("button", { name: /Reveal Ratings & Simulate/ }).click();
  await page.getByRole("button", { name: new RegExp(`Kick Off Season ${season}`) }).click({ timeout: 15_000 });
  await page.getByRole("button", { name: new RegExp(`Continue to Season ${season + 1}`) }).click({ timeout: 20_000 });
  await expect(page.getByText("Transfer Window", { exact: true })).toBeVisible();
}
```

`tests/e2e/career-smoke.spec.js`:

```js
import { test, expect } from "@playwright/test";
import { draftFullXI, playSeasonToTransfer } from "./helpers.js";

test("draft, simulate season 1, pass the transfer window into season 2", async ({ page }) => {
  await page.goto("./");
  await draftFullXI(page);
  await expect(page.getByRole("button", { name: /Reveal Ratings & Simulate/ })).toBeVisible();

  await playSeasonToTransfer(page, 1);
  await page.getByRole("button", { name: /Continue to Season 2/ }).click();

  await expect(page.getByRole("button", { name: /Reveal Ratings & Simulate/ })).toBeVisible();
  await expect(page.getByText("Season 2 · 2027-28").first()).toBeAttached();
});
```

- [ ] **Step 3: Run it**

Run: `npm run e2e`
Expected: 3 passed (chromium-mobile, webkit-mobile, chromium-desktop).

- [ ] **Step 4: Add e2e to CI**

In `.github/workflows/ci.yml`, job `check`, insert after `- run: npm run build`:

```yaml
      - run: npx playwright install --with-deps chromium webkit
      - run: npm run e2e
      - if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report
```

- [ ] **Step 5: Commit**

```bash
git add playwright.config.js tests/e2e package.json package-lock.json .github/workflows/ci.yml
git commit -m "Add Playwright career smoke test to CI" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Move the data to lazily loaded JSON

**Files:**
- Create: `scripts/extract-data.mjs`, `src/data/players.json`, `src/data/championship.json`, `src/data/loadDataset.js`, `src/data/loadDataset.test.js`, `src/components/app/DatasetGate.jsx`, `src/components/app/DatasetGate.test.jsx`
- Modify: `src/App.jsx` (line 7 `const DATASET`, lines 776–777 `CHAMPIONSHIP_POOL`, lines 811–829 `initialState`, lines 916, 1081, 2068), `src/main.jsx`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `loadDataset(): Promise<Dataset>` where `Dataset = { clubs: Record<string,string>, squads: Record<string, Row[]>, index: Array<{ y: string, c: string, label: string }>, opponents: Opponent[], championship: Opponent[] }`. Cached; a failed load clears the cache so Retry works.
  - `<DatasetGate load={() => Promise<Dataset>}>{(dataset) => ReactNode}</DatasetGate>`.
  - **Temporary** (removed in Task 11): `export function installDataset(dataset)` in `src/App.jsx`, and `makeInitialState()` replacing the `initialState` constant.

- [ ] **Step 1: Write the failing loader test**

`src/data/loadDataset.test.js`:

```js
// @vitest-environment node
import { describe, it, expect } from "vitest";
import { loadDataset } from "./loadDataset.js";

describe("loadDataset", () => {
  it("loads players and championship data once", async () => {
    const first = await loadDataset();
    const second = await loadDataset();
    expect(second).toBe(first);
    expect(Object.keys(first.clubs)).toHaveLength(51);
    expect(Object.keys(first.squads)).toHaveLength(666);
    expect(first.index).toHaveLength(666);
    expect(first.opponents).toHaveLength(19);
    expect(first.championship).toHaveLength(24);
    expect(first.squads["1992_11"][0][0]).toBe("Paul Merson");
  });
});
```

Run: `npx vitest run src/data/loadDataset.test.js`
Expected: FAIL — `Failed to resolve import "./loadDataset.js"`.

- [ ] **Step 2: Extract the data**

`scripts/extract-data.mjs` (run once, committed for the record):

```js
// One-off: moves the DATASET and CHAMPIONSHIP_POOL literals out of src/App.jsx into JSON.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const APP = "src/App.jsx";
const lines = readFileSync(APP, "utf8").replace(/\r\n/g, "\n").split("\n");

const DATA_LINE = 6;   // line 7
const POOL_LINE = 775; // line 776, followed by a lone ";" on line 777
if (!lines[DATA_LINE].startsWith("const DATASET = ")) throw new Error("line 7 is not the DATASET literal");
if (!lines[POOL_LINE].startsWith("const CHAMPIONSHIP_POOL = ")) throw new Error("line 776 is not the CHAMPIONSHIP_POOL literal");
if (lines[POOL_LINE + 1].trim() !== ";") throw new Error("line 777 is not the closing semicolon");

const players = JSON.parse(lines[DATA_LINE].slice("const DATASET = ".length).replace(/;\s*$/, ""));
const championship = JSON.parse(lines[POOL_LINE].slice("const CHAMPIONSHIP_POOL = ".length));

mkdirSync("src/data", { recursive: true });
writeFileSync("src/data/players.json", JSON.stringify(players) + "\n");
writeFileSync("src/data/championship.json", JSON.stringify(championship, null, 1) + "\n");

lines[DATA_LINE] = "let DATASET = null; // installed at startup by installDataset() — temporary until Task 11";
lines[POOL_LINE] = "let CHAMPIONSHIP_POOL = null;";
lines[POOL_LINE + 1] = "";
writeFileSync(APP, lines.join("\n"));
console.log("players.json squads:", Object.keys(players.squads).length, "| championship clubs:", championship.length);
```

Run: `node scripts/extract-data.mjs`
Expected: `players.json squads: 666 | championship clubs: 24`. `src/App.jsx` shrinks from ≈1.08 MB to ≈140 KB.

- [ ] **Step 3: Write the loader**

`src/data/loadDataset.js`:

```js
let pending = null;

// Dynamic imports give the data its own cached chunk (parsed via JSON.parse,
// see vite.config.js json.stringify). The standalone single-file build inlines it.
export function loadDataset() {
  if (!pending) {
    pending = Promise.all([import("./players.json"), import("./championship.json")])
      .then(([players, championship]) => ({ ...players.default, championship: championship.default }))
      .catch((error) => {
        pending = null;
        throw error;
      });
  }
  return pending;
}
```

Run: `npx vitest run src/data/loadDataset.test.js`
Expected: PASS.

- [ ] **Step 4: Write the failing DatasetGate test**

`src/components/app/DatasetGate.test.jsx`:

```jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DatasetGate from "./DatasetGate.jsx";

describe("DatasetGate", () => {
  it("shows a loading state, then renders children with the dataset", async () => {
    const load = vi.fn(() => Promise.resolve({ opponents: [1, 2, 3] }));
    render(<DatasetGate load={load}>{(d) => <p>{d.opponents.length} rivals</p>}</DatasetGate>);
    expect(screen.getByRole("status").textContent).toMatch(/Loading player data/);
    expect(await screen.findByText("3 rivals")).toBeTruthy();
  });

  it("shows an error with Retry, and retries the load", async () => {
    const load = vi.fn()
      .mockImplementationOnce(() => Promise.reject(new Error("offline")))
      .mockImplementationOnce(() => Promise.resolve({ opponents: [] }));
    render(<DatasetGate load={load}>{() => <p>ready</p>}</DatasetGate>);
    expect(await screen.findByText(/Couldn't load player data/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("ready")).toBeTruthy();
    expect(load).toHaveBeenCalledTimes(2);
  });
});
```

Run: `npx vitest run src/components/app/DatasetGate.test.jsx`
Expected: FAIL — cannot resolve `./DatasetGate.jsx`.

- [ ] **Step 5: Implement DatasetGate**

`src/components/app/DatasetGate.jsx`:

```jsx
import { useEffect, useState } from "react";

const SHELL = "min-h-screen w-full flex flex-col items-center justify-center gap-3 px-6 text-center text-neutral-300";
const SHELL_BG = { background: "linear-gradient(180deg, #0c1310 0%, #090d0b 55%, #07100c 100%)" };

export default function DatasetGate({ load, children }) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ status: "loading", dataset: null });

  useEffect(() => {
    let cancelled = false;
    setResult({ status: "loading", dataset: null });
    load().then(
      (dataset) => { if (!cancelled) setResult({ status: "ready", dataset }); },
      () => { if (!cancelled) setResult({ status: "error", dataset: null }); },
    );
    return () => { cancelled = true; };
  }, [load, attempt]);

  if (result.status === "ready") return children(result.dataset);

  if (result.status === "error") {
    return (
      <div className={SHELL} style={SHELL_BG} role="alert">
        <p className="text-sm">Couldn't load player data. Check your connection.</p>
        <button type="button" onClick={() => setAttempt((a) => a + 1)}
          className="px-5 py-2.5 rounded-md font-bold uppercase tracking-wide text-xs text-white" style={{ background: "#059669" }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={SHELL} style={SHELL_BG}>
      <p role="status" className="text-sm">Loading player data…</p>
    </div>
  );
}
```

Run: `npx vitest run src/components/app/DatasetGate.test.jsx`
Expected: PASS, 2 tests.

- [ ] **Step 6: Install the dataset at startup**

In `src/App.jsx`:

1. Directly below the line `let DATASET = null; ...` add:

```js
export function installDataset(dataset) {
  DATASET = dataset;
  CHAMPIONSHIP_POOL = dataset.championship;
}
```

(`CHAMPIONSHIP_POOL` is declared further down with `let`; assignment inside a function called after module evaluation is valid.)

2. Replace `const initialState = {` (line 811) with `function makeInitialState() {\n  return {`, and close it by replacing the object's closing `};` (line 829) with `  };\n}`. Leave every field as it is.

3. Line 916 (`SET_FORMATION`): `...initialState,` → `...makeInitialState(),`
4. Line 1081 (`RESET`): `return { ...initialState, assignments: makeInitialAssignments("4-3-3") };` → `return makeInitialState();`
5. Line 2068: `useReducer(reducer, initialState)` → `useReducer(reducer, undefined, makeInitialState)`

`src/main.jsx`:

```jsx
import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import FMWeb, { installDataset } from "./App.jsx";
import DatasetGate from "./components/app/DatasetGate.jsx";
import { loadDataset } from "./data/loadDataset.js";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <DatasetGate load={loadDataset}>
      {(dataset) => {
        installDataset(dataset);
        return <FMWeb />;
      }}
    </DatasetGate>
  </React.StrictMode>
);
```

- [ ] **Step 7: Verify**

Run: `npm run lint && npm test && npm run build`
Expected: lint 0 errors (4 known warnings); tests pass; build output now has a separate `players-*.js` chunk (≈ 940 kB, starts with `JSON.parse(`), a `championship-*.js` chunk, and `index-*.js` well under 300 kB.

Run: `npm run e2e`
Expected: 3 passed.

- [ ] **Step 8: Commit**

```bash
git add scripts/extract-data.mjs src/data src/components/app src/App.jsx src/main.jsx
git commit -m "Load player data from JSON on demand" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Engine basics — util, formations, roles, instructions, players

**Files:**
- Create: `tests/fixtures/miniDataset.js`, `src/engine/util.js`, `src/engine/formations.js`, `src/engine/roles.js`, `src/engine/instructions.js`, `src/engine/players.js`, `src/engine/basics.test.js`, `src/engine/players.test.js`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `Dataset` from Task 4.
- Produces:
  - `util.js`: `clamp(v, lo, hi): number`, `seasonLabel(year: number|string): string` (e.g. `seasonLabel(2026) === "2026-27"`).
  - `formations.js`: `FORMATIONS`, `SLOT_TYPE_LABEL`, `makeInitialAssignments(formationKey): Assignment[]`.
  - `roles.js`: `ROLES`, `DUTY_INFO`, `defaultRoleFor(slotType): Role`, `defaultDutyFor(role): string`.
  - `instructions.js`: `DEFAULT_INSTRUCTIONS`, `STYLE_PRESETS`.
  - `players.js`: `STAT_KEYS`, `STAT_LABELS`, `rowToPlayer(row, seasonKey): Player`, `slotAccepts(slotType, player): boolean`, `createSquadLookup(dataset): (year, clubId) => Player[]` (cached per key), `buildPool(getSquad, year, clubId, slotType, side, draftedIds: Set<string>): Player[]` (array with a `.relaxed` boolean property, exactly as v1).
  - `tests/fixtures/miniDataset.js`: `makeMiniDataset(): Dataset` — 8 club-seasons, season `2005_3` has no DM, "Sam Twice" (Wales) appears in `2000_1` age 25 and `2001_1` age 26, two different "Alan Smith" (England) in `2000_2` age 28 and `2010_4` age 25; 19 opponents `Rival 1..19`; 24 championship clubs `Challenger 1..24`.

- [ ] **Step 1: Create the fixture dataset**

`tests/fixtures/miniDataset.js`:

```js
// Small, deterministic dataset for engine and reducer tests.
// Row layout: [name, slot, side, age, nat, ov, pace, shooting, passing, dribbling, defending, physical]
const SLOT_PLAN = [
  ["GK", ""], ["GK", ""], ["CB", ""], ["CB", ""], ["CB", ""], ["FB", "L"], ["FB", "R"], ["FB", "L"],
  ["DM", ""], ["DM", ""], ["CM", ""], ["CM", ""], ["CM", ""], ["AM", ""], ["AM", ""],
  ["WIDE", "L"], ["WIDE", "R"], ["WIDE", "L"], ["ST", ""], ["ST", ""],
];

function row(name, slot, side, age, nat, ov) {
  return [name, slot, side, age, nat, ov, ov - 2, ov - 4, ov - 1, ov - 3, ov - 5, ov - 2];
}

export function makeMiniDataset() {
  const clubs = { 1: "Alpha FC", 2: "Beta United", 3: "Gamma Town", 4: "Delta City" };
  const seasons = [["2000", "1"], ["2001", "1"], ["2000", "2"], ["2001", "2"], ["2005", "3"], ["2006", "3"], ["2010", "4"], ["2011", "4"]];
  const squads = {};
  const index = [];
  for (const [y, c] of seasons) {
    const key = `${y}_${c}`;
    squads[key] = SLOT_PLAN
      .filter(([slot]) => !(key === "2005_3" && slot === "DM"))
      .map(([slot, side], i) => row(`${clubs[c]} ${slot}${i} ${y}`, slot, side, 20 + (i % 12), "England", 60 + ((i * 7 + Number(y)) % 30)));
    index.push({ y, c, label: `${clubs[c]} ${seasonText(y)}` });
  }
  // The same real player in two seasons (born 1975).
  squads["2000_1"].push(row("Sam Twice", "ST", "", 25, "Wales", 88));
  squads["2001_1"].push(row("Sam Twice", "ST", "", 26, "Wales", 89));
  // Two different people sharing a name and nationality (born 1972 and 1985).
  squads["2000_2"].push(row("Alan Smith", "ST", "", 28, "England", 80));
  squads["2010_4"].push(row("Alan Smith", "ST", "", 25, "England", 79));

  const opponents = Array.from({ length: 19 }, (_, i) => ({
    name: `Rival ${i + 1}`, ov: 70 + i, lastSeason: "2024", histMean: 72, histStd: 3, weight: 1, vol: 8,
  }));
  const championship = Array.from({ length: 24 }, (_, i) => ({
    name: `Challenger ${i + 1}`, ov: 65 + (i % 8), histMean: 66, histStd: 3, weight: 0.95, vol: 9,
  }));
  return { clubs, squads, index, opponents, championship };
}

function seasonText(y) {
  return `${y}-${String(Number(y) + 1).slice(2)}`;
}
```

- [ ] **Step 2: Write the failing tests**

`src/engine/basics.test.js`:

```js
// @vitest-environment node
import { describe, it, expect } from "vitest";
import { clamp, seasonLabel } from "./util.js";
import { FORMATIONS, SLOT_TYPE_LABEL, makeInitialAssignments } from "./formations.js";
import { ROLES, DUTY_INFO, defaultRoleFor, defaultDutyFor } from "./roles.js";
import { DEFAULT_INSTRUCTIONS, STYLE_PRESETS } from "./instructions.js";

describe("util", () => {
  it("clamps and labels seasons", () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(seasonLabel(2026)).toBe("2026-27");
    expect(seasonLabel(1999)).toBe("1999-00");
  });
});

describe("formations and roles", () => {
  it("every formation has 11 slots, exactly one GK, and roles for every slot type", () => {
    for (const [key, formation] of Object.entries(FORMATIONS)) {
      expect(formation.slots, key).toHaveLength(11);
      expect(formation.slots.filter((s) => s.type === "GK"), key).toHaveLength(1);
      for (const slot of formation.slots) {
        expect(ROLES[slot.type], `${key} ${slot.type}`).toBeDefined();
        expect(SLOT_TYPE_LABEL[slot.type]).toBeDefined();
      }
    }
  });

  it("builds empty assignments at template positions", () => {
    const a = makeInitialAssignments("4-3-3");
    expect(a).toHaveLength(11);
    expect(a[0]).toEqual({ slotId: "GK", type: "GK", side: null, player: null, role: null, duty: null, sliderAtt: 50, sliderDef: 50, pos: { x: 50, y: 92 } });
  });

  it("prefers the Support duty when a role allows it", () => {
    expect(defaultRoleFor("ST").key).toBe("POA");
    expect(defaultDutyFor(defaultRoleFor("ST"))).toBe("Attack");
    expect(defaultDutyFor(ROLES.CM[0])).toBe("Support");
    expect(Object.keys(DUTY_INFO)).toEqual(["Defend", "Support", "Attack"]);
  });

  it("has 7 style presets and a neutral default", () => {
    expect(STYLE_PRESETS.map((s) => s.key)).toEqual(["gegenpress", "possession", "counter", "direct", "parkbus", "wingplay", "balanced"]);
    expect(DEFAULT_INSTRUCTIONS.mentality).toBe(50);
  });
});
```

`src/engine/players.test.js`:

```js
// @vitest-environment node
import { describe, it, expect } from "vitest";
import { makeMiniDataset } from "../../tests/fixtures/miniDataset.js";
import { STAT_KEYS, rowToPlayer, slotAccepts, createSquadLookup, buildPool } from "./players.js";

describe("players", () => {
  it("maps a data row to a player", () => {
    const p = rowToPlayer(["Tony Adams", "CB", "", 26, "England", 91, 87, 76, 82, 73, 96, 96], "1992_11");
    expect(p).toEqual({
      id: "1992_11__Tony Adams__91__CB", name: "Tony Adams", slot: "CB", side: null, age: 26, nat: "England", ov: 91,
      stats: { pace: 87, shooting: 76, passing: 82, dribbling: 73, defending: 96, physical: 96 }, seasonKey: "1992_11",
    });
    expect(STAT_KEYS).toHaveLength(6);
    expect(slotAccepts("ANY", p)).toBe(true);
    expect(slotAccepts("GK", p)).toBe(false);
  });

  it("caches squads per club-season and returns [] for unknown keys", () => {
    const getSquad = createSquadLookup(makeMiniDataset());
    expect(getSquad("2000", "1")).toBe(getSquad(2000, 1));
    expect(getSquad("1990", "9")).toEqual([]);
  });

  it("builds a strict-position pool, side-matched first then by rating, excluding drafted players", () => {
    const getSquad = createSquadLookup(makeMiniDataset());
    const all = buildPool(getSquad, "2000", "1", "FB", "R", new Set());
    expect(all.relaxed).toBe(false);
    expect(all.every((p) => p.slot === "FB")).toBe(true);
    expect(all[0].side).toBe("R");
    const lefts = all.filter((p) => p.side === "L");
    expect(lefts[0].ov).toBeGreaterThanOrEqual(lefts[1].ov);

    const without = buildPool(getSquad, "2000", "1", "FB", "R", new Set([all[0].id]));
    expect(without.map((p) => p.id)).not.toContain(all[0].id);
  });

  it("relaxes to the whole squad when no player of that position is left", () => {
    const getSquad = createSquadLookup(makeMiniDataset());
    const pool = buildPool(getSquad, "2005", "3", "DM", null, new Set());
    expect(pool.relaxed).toBe(true);
    expect(pool.length).toBe(getSquad("2005", "3").length);
  });
});
```

Run: `npx vitest run src/engine`
Expected: FAIL — cannot resolve `./util.js`, `./players.js`.

- [ ] **Step 3: Create the modules by moving code out of `src/App.jsx`**

Cut each declaration listed (with the comment block directly above it) from `src/App.jsx`, paste it verbatim into the module, and prefix it with `export`. Only the code shown explicitly below is new or changed.

`src/engine/util.js` — move `clamp`, `seasonLabel`.

`src/engine/formations.js`:

```js
// moved verbatim: FORMATIONS, SLOT_TYPE_LABEL, makeInitialAssignments
```

`src/engine/roles.js` — move `ROLES`, `DUTY_INFO`, `defaultRoleFor`, `defaultDutyFor`.

`src/engine/instructions.js` — move `DEFAULT_INSTRUCTIONS`, `STYLE_PRESETS`.

`src/engine/players.js` — move `STAT_KEYS`, `STAT_LABELS`, `rowToPlayer`, `slotAccepts`. **Delete** `getSquad` from `App.jsx` and add these two new functions (the `buildPool` body is v1's with the `getSquad` parameter added):

```js
export function createSquadLookup(dataset) {
  const cache = new Map();
  return function getSquad(year, clubId) {
    const key = `${year}_${clubId}`;
    if (!cache.has(key)) {
      cache.set(key, (dataset.squads[key] || []).map((row) => rowToPlayer(row, key)));
    }
    return cache.get(key);
  };
}

export function buildPool(getSquad, year, clubId, slotType, side, draftedIds) {
  const squad = getSquad(year, clubId);
  // Strict position matching: a GK slot only offers goalkeepers from that exact
  // club season, a CB slot only offers centre-backs, etc. The only fallback is
  // for the rare case a squad has zero tagged players of that exact category
  // left — then we open up to the rest of the available squad.
  let pool = squad.filter((p) => !draftedIds.has(p.id) && slotAccepts(slotType, p));
  let relaxed = false;
  if (pool.length === 0) { pool = squad.filter((p) => !draftedIds.has(p.id)); relaxed = true; }
  // prefer matching side first, then by overall
  pool.sort((a, b) => {
    if (side) {
      const aSide = a.side === side ? 1 : 0;
      const bSide = b.side === side ? 1 : 0;
      if (aSide !== bSide) return bSide - aSide;
    }
    return b.ov - a.ov;
  });
  pool.relaxed = relaxed;
  return pool;
}
```

The squad lookup caches converted players; callers only filter, sort copies and read them, never mutate player objects (checked by reading every use).

- [ ] **Step 4: Wire `App.jsx` to the modules**

Add below the React import in `src/App.jsx`:

```js
import { clamp, seasonLabel } from "./engine/util.js";
import { FORMATIONS, SLOT_TYPE_LABEL, makeInitialAssignments } from "./engine/formations.js";
import { ROLES, DUTY_INFO, defaultRoleFor, defaultDutyFor } from "./engine/roles.js";
import { DEFAULT_INSTRUCTIONS, STYLE_PRESETS } from "./engine/instructions.js";
import { STAT_KEYS, STAT_LABELS, createSquadLookup, buildPool } from "./engine/players.js";
```

Replace the temporary globals so `getSquad` still exists for the code that remains in `App.jsx`:

```js
let DATASET = null; // installed at startup by installDataset() — temporary until Task 11
let getSquad = null;
export function installDataset(dataset) {
  DATASET = dataset;
  CHAMPIONSHIP_POOL = dataset.championship;
  getSquad = createSquadLookup(dataset);
}
```

In the reducer `LAND` case, change `buildPool(action.year, action.clubId, slotType, side, state.draftedIds)` to `buildPool(getSquad, action.year, action.clubId, slotType, side, state.draftedIds)`.

- [ ] **Step 5: Verify**

Run: `npx vitest run src/engine`
Expected: PASS (5 + 4 tests).

Run: `npm run lint && npm test && npm run build && npm run e2e`
Expected: lint 0 errors and still exactly the 4 known `no-unused-vars` warnings (no new ones — an extra warning means an unnecessary import); all green.

- [ ] **Step 6: Commit**

```bash
git add tests/fixtures src/engine src/App.jsx
git commit -m "Extract engine constants, formations, roles and player pools" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Engine tactics — team profile, familiarity, readout (golden profiles)

**Files:**
- Create: `src/engine/tactics.js`, `src/engine/familiarity.js`, `src/engine/readout.js`, `tests/unit/golden-profiles.test.js`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `clamp` (util), `FORMATIONS` (formations), `DUTY_INFO` (roles), `tests/golden/xis.json`, `tests/golden/profiles.json`.
- Produces:
  - `tactics.js`: `compress(v, threshold?, factor?)`, `executionMultiplier(familiarity)`, `positionFactors(pos)`, `playerContribution(assignment)`, `computeTeamProfile(assignmentsWithRoleObjects, instructions, familiarity = 60): Profile`, `identitySynergy(instructions, familiarity, physical)`.
  - `familiarity.js`: `computeFamiliarity(assignmentsWithRoleObjects, instructions, formationKey): number`, `familiarityLabel(f): string`.
  - `readout.js`: `tacticalReadout(profile, instructions, familiarity): string[]`, `mentalityLabel(v): string`.

- [ ] **Step 1: Write the failing golden test**

`tests/unit/golden-profiles.test.js`:

```js
// @vitest-environment node
import { describe, it, expect } from "vitest";
import xis from "../golden/xis.json";
import profiles from "../golden/profiles.json";
import { STYLE_PRESETS } from "../../src/engine/instructions.js";
import { computeTeamProfile } from "../../src/engine/tactics.js";
import { computeFamiliarity } from "../../src/engine/familiarity.js";
import { tacticalReadout } from "../../src/engine/readout.js";

const plain = (value) => JSON.parse(JSON.stringify(value));

describe("golden: familiarity, team profile and readout match v1 exactly", () => {
  it("covers 20 XIs × 7 styles", () => {
    expect(profiles).toHaveLength(140);
  });

  it.each(profiles.map((entry, i) => [i, entry]))("entry %i", (_i, entry) => {
    const xi = xis[entry.xiIndex];
    const style = STYLE_PRESETS.find((s) => s.key === entry.style);
    const familiarity = computeFamiliarity(xi.assignments, style.instructions, xi.formationKey);
    expect(familiarity).toBe(entry.familiarity);
    const profile = computeTeamProfile(xi.assignments, style.instructions, familiarity);
    expect(plain(profile)).toEqual(entry.profile);
    expect(tacticalReadout(profile, style.instructions, familiarity)).toEqual(entry.readout);
  });
});
```

Run: `npx vitest run tests/unit/golden-profiles.test.js`
Expected: FAIL — cannot resolve `../../src/engine/tactics.js`.

- [ ] **Step 2: Move the code**

Cut from `src/App.jsx` verbatim (with the comment block directly above each), add `export`:

- `src/engine/tactics.js` ← `compress`, `executionMultiplier`, `positionFactors`, `playerContribution`, `computeTeamProfile`, `identitySynergy`, plus the big `/* === Team Tactics Engine === */` comment. Header:

```js
import { clamp } from "./util.js";
import { DUTY_INFO } from "./roles.js";
```

- `src/engine/familiarity.js` ← `computeFamiliarity`, `familiarityLabel`. Header:

```js
import { clamp } from "./util.js";
import { FORMATIONS } from "./formations.js";
```

- `src/engine/readout.js` ← `tacticalReadout` and `mentalityLabel` (the latter sits between `RoleEditor` and `StyleSelector`, around line 1467). No imports.

Do not "fix" anything while moving — e.g. the unused `foc` in `identitySynergy` stays until Task 28.

Add to the import block in `src/App.jsx`:

```js
import { playerContribution, computeTeamProfile } from "./engine/tactics.js";
import { computeFamiliarity, familiarityLabel } from "./engine/familiarity.js";
import { tacticalReadout, mentalityLabel } from "./engine/readout.js";
```

- [ ] **Step 3: Verify**

Run: `npx vitest run tests/unit/golden-profiles.test.js`
Expected: PASS, 141 tests. Any mismatch means the move changed code — diff the module against `git show 6495fb8:src/App.jsx`, never edit the golden file.

Run: `npm run lint && npm test && npm run build && npm run e2e`
Expected: all green, still exactly 4 lint warnings (the `foc` warning now points at `src/engine/tactics.js`).

- [ ] **Step 4: Commit**

```bash
git add src/engine tests/unit/golden-profiles.test.js src/App.jsx
git commit -m "Extract tactics, familiarity and readout engine modules" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Engine simulation — match, season, league (golden seasons and league)

**Files:**
- Create: `src/engine/match.js`, `src/engine/season.js`, `src/engine/league.js`, `src/engine/season.test.js`, `tests/unit/golden-seasons.test.js`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `clamp`, `seasonLabel` (util); `mulberry32`, `withSeededMathRandom` exported by `scripts/capture-golden.mjs`; `tests/golden/seasons.json`, `league.json`; `src/data/players.json`, `src/data/championship.json`.
- Produces (still using `Math.random` — Task 10 replaces it):
  - `match.js`: `poissonSample(lambda)`, `simulateMatch(profile, opp, isHome, familiarity)`.
  - `season.js`: `roundRobinSchedule(teamIds): Array<Array<[home, away]>>`, `buildUserFixtureList(opponentNames): Array<{ week, name, home }>`, `estimateClubPoints(opp)`, `seasonTier({ w, l, pts, position }): { name, sub, color }`, `simulateSeason(profile, familiarity, opponents): SeasonResult`, `CAREER_SEASONS = 6`, `careerSeasonLabel(season)`.
  - `league.js`: `drawPromotedClubs(pool, count, currentNames: Set<string>)`, `applyPromotionRelegation(opponents, table, pool): { opponents, relegated: string[], promoted: string[] }`.

- [ ] **Step 1: Write the failing tests**

`tests/unit/golden-seasons.test.js`:

```js
// @vitest-environment node
import { describe, it, expect } from "vitest";
import seasons from "../golden/seasons.json";
import league from "../golden/league.json";
import players from "../../src/data/players.json";
import championship from "../../src/data/championship.json";
import { withSeededMathRandom } from "../../scripts/capture-golden.mjs";
import { simulateSeason } from "../../src/engine/season.js";
import { applyPromotionRelegation } from "../../src/engine/league.js";

const plain = (value) => JSON.parse(JSON.stringify(value));

describe("golden: seeded season simulations match v1", () => {
  it.each(seasons.map((entry) => [entry.seed, entry]))("season seed %i", (seed, entry) => {
    const result = withSeededMathRandom(seed, () => simulateSeason(entry.profile, entry.familiarity, players.opponents));
    expect(plain(result)).toEqual(entry.result);
  });
});

describe("golden: seeded promotion/relegation matches v1", () => {
  it.each(league.map((entry) => [entry.seed, entry]))("league seed %i", (seed, entry) => {
    const result = withSeededMathRandom(seed, () => applyPromotionRelegation(players.opponents, entry.table, championship));
    expect(plain(result)).toEqual(entry.result);
  });
});
```

`src/engine/season.test.js`:

```js
// @vitest-environment node
import { describe, it, expect } from "vitest";
import { roundRobinSchedule, buildUserFixtureList, seasonTier, careerSeasonLabel, CAREER_SEASONS } from "./season.js";
import { applyPromotionRelegation } from "./league.js";

describe("fixtures", () => {
  it("schedules 38 rounds where every ordered home/away pair happens exactly once", () => {
    const teams = Array.from({ length: 20 }, (_, i) => `T${i}`);
    const rounds = roundRobinSchedule(teams);
    expect(rounds).toHaveLength(38);
    const seen = new Map();
    for (const round of rounds) {
      expect(round).toHaveLength(10);
      expect(new Set(round.flat()).size).toBe(20);
      for (const [h, a] of round) seen.set(`${h}>${a}`, (seen.get(`${h}>${a}`) || 0) + 1);
    }
    expect(seen.size).toBe(380);
    expect([...seen.values()].every((n) => n === 1)).toBe(true);
  });

  it("gives the user each opponent once at home and once away, alternating in the first half", () => {
    const names = Array.from({ length: 19 }, (_, i) => `Rival ${i + 1}`);
    const fixtures = buildUserFixtureList(names);
    expect(fixtures).toHaveLength(38);
    for (const name of names) {
      const games = fixtures.filter((f) => f.name === name);
      expect(games.map((g) => g.home).sort()).toEqual([false, true]);
    }
    expect(fixtures.slice(0, 4).map((f) => f.home)).toEqual([true, false, true, false]);
  });
});

describe("season tiers", () => {
  it.each([
    [{ w: 38, l: 0, pts: 114, position: 1 }, "THE PERFECT SEASON"],
    [{ w: 30, l: 0, pts: 98, position: 1 }, "Invincibles"],
    [{ w: 33, l: 1, pts: 100, position: 2 }, "Centurions"],
    [{ w: 28, l: 4, pts: 90, position: 1 }, "Champions"],
    [{ w: 22, l: 8, pts: 74, position: 5 }, "Champions League"],
    [{ w: 20, l: 10, pts: 68, position: 7 }, "Europa League"],
    [{ w: 18, l: 11, pts: 62, position: 8 }, "Conference League"],
    [{ w: 12, l: 14, pts: 48, position: 17 }, "Mid-Table Mediocrity"],
    [{ w: 8, l: 20, pts: 34, position: 18 }, "Relegation Battle"],
  ])("%o → %s", (input, name) => {
    expect(seasonTier(input).name).toBe(name);
  });

  it("labels career seasons from 2026-27", () => {
    expect(CAREER_SEASONS).toBe(6);
    expect(careerSeasonLabel(1)).toBe("2026-27");
    expect(careerSeasonLabel(6)).toBe("2031-32");
  });
});

describe("promotion and relegation", () => {
  const opponents = Array.from({ length: 19 }, (_, i) => ({ name: `Rival ${i + 1}` }));
  const pool = Array.from({ length: 24 }, (_, i) => ({ name: `Challenger ${i + 1}` }));

  it("changes nothing without a table", () => {
    expect(applyPromotionRelegation(opponents, null, pool)).toEqual({ opponents, relegated: [], promoted: [] });
  });

  it("relegates rivals finishing 18th-20th (never the user) and keeps 19 rivals", () => {
    const table = [...opponents.map((o, i) => ({ name: o.name, isUser: false, position: i + 2 })), { name: "Your XI", isUser: true, position: 1 }];
    const result = applyPromotionRelegation(opponents, table, pool);
    expect(result.relegated).toEqual(["Rival 17", "Rival 18", "Rival 19"]);
    expect(result.promoted).toHaveLength(3);
    expect(result.opponents).toHaveLength(19);
  });
});
```

Run: `npx vitest run tests/unit/golden-seasons.test.js src/engine/season.test.js`
Expected: FAIL — cannot resolve `../../src/engine/season.js`.

- [ ] **Step 2: Move and adjust the code**

`src/engine/match.js` ← move `poissonSample`, `simulateMatch` verbatim. Header: `import { clamp } from "./util.js";`

`src/engine/season.js` ← move `roundRobinSchedule`, `buildUserFixtureList`, `estimateClubPoints`, `simulateSeason`, `CAREER_SEASONS`, `careerSeasonLabel` verbatim (with their comments). Header:

```js
import { clamp, seasonLabel } from "./util.js";
import { simulateMatch } from "./match.js";
```

Then split the tier ladder out of `simulateSeason`. Replace the whole `let tier; if (w === 38) ... else tier = {...};` block with:

```js
  const tier = seasonTier({ w, l, pts, position });
```

and add, below `simulateSeason`, the ladder moved unchanged into its own function:

```js
export function seasonTier({ w, l, pts, position }) {
  if (w === 38) return { name: "THE PERFECT SEASON", sub: "38 from 38 — a perfect points-per-game record with games to spare. No side in the league's history has ever managed it.", color: "amber" };
  if (l === 0 && position === 1) return { name: "Invincibles", sub: "Champions and unbeaten from August to May — a status only one Premier League side has ever achieved.", color: "amber" };
  if (pts >= 100) return { name: "Centurions", sub: "Past the 100-point mark — a ruthless, record-breaking points total that dwarfs most title-winning campaigns.", color: "amber" };
  if (position === 1) return { name: "Champions", sub: "Crowned champions of England — the trophy, the open-top bus, the lot.", color: "emerald" };
  if (position <= 5) return { name: "Champions League", sub: "A top-five finish and Champions League football to plan for next season.", color: "sky" };
  if (position <= 7) return { name: "Europa League", sub: "European qualification secured — a genuinely solid campaign in the top half.", color: "violet" };
  if (position === 8) return { name: "Conference League", sub: "Just enough for European football — a season that overachieved its underlying numbers.", color: "violet" };
  if (position <= 17) return { name: "Mid-Table Mediocrity", sub: "Comfortable and safe, but nothing to shout about — a season that will be forgotten by August.", color: "slate" };
  return { name: "Relegation Battle", sub: "A relegation dogfight that went the wrong way — back to the drawing board.", color: "rose" };
}
```

(Copy the `sub` strings from `App.jsx` lines 754–762 character for character; the golden test will catch any difference.)

`src/engine/league.js` — move the promotion comment blocks, and replace the two functions with these versions, which take the Championship pool as a parameter instead of reading the `CHAMPIONSHIP_POOL` global (logic otherwise identical):

```js
export function drawPromotedClubs(pool, count, currentNames) {
  const available = pool.filter((c) => !currentNames.has(c.name));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((c) => ({ ...c, lastSeason: "promoted" }));
}

export function applyPromotionRelegation(opponents, table, pool) {
  if (!table) return { opponents, relegated: [], promoted: [] };
  const relegatedNames = table.filter((r) => !r.isUser && r.position >= 18).map((r) => r.name);
  if (relegatedNames.length === 0) return { opponents, relegated: [], promoted: [] };
  const survivors = opponents.filter((o) => !relegatedNames.includes(o.name));
  const currentNames = new Set(survivors.map((o) => o.name));
  const promotedClubs = drawPromotedClubs(pool, relegatedNames.length, currentNames);
  return { opponents: [...survivors, ...promotedClubs], relegated: relegatedNames, promoted: promotedClubs.map((c) => c.name) };
}
```

In `src/App.jsx`: delete the `CHAMPIONSHIP_POOL` comment block that described the pool (it moved), keep the `let CHAMPIONSHIP_POOL = null;` declaration, and in the reducer `GOTO_TRANSFER` case change the call to `applyPromotionRelegation(state.opponents, state.simulation?.table, CHAMPIONSHIP_POOL)`. Add imports:

```js
import { simulateSeason, CAREER_SEASONS, careerSeasonLabel } from "./engine/season.js";
import { applyPromotionRelegation } from "./engine/league.js";
```

- [ ] **Step 3: Verify**

Run: `npx vitest run tests/unit/golden-seasons.test.js src/engine/season.test.js`
Expected: PASS (40 golden + 14 unit tests).

Run: `npm run lint && npm test && npm run build && npm run e2e`
Expected: all green, 4 lint warnings.

- [ ] **Step 4: Commit**

```bash
git add src/engine tests/unit/golden-seasons.test.js src/App.jsx
git commit -m "Extract match, season and league engine modules" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Engine squad — bench, shortlist, signings

**Files:**
- Create: `src/engine/squad.js`, `src/engine/squad.test.js`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `defaultRoleFor`, `defaultDutyFor` (roles); a `getSquad` from `createSquadLookup`.
- Produces:
  - `nextEmptySlotIndex(assignments): number` (-1 when full).
  - `autoFillBench(getSquad, assignments, draftedIds): { bench: Array<{ player, role: null, duty: null }>, draftedIds: Set<string> }`.
  - `generateShortlist(getSquad, index, { eraMin, eraMax }, ownedIds: Set<string>, count = 5): Player[]` (still `Math.random`; Task 10 inserts an `rng` parameter before `count`).
  - `signToSlot(assignments, bench, slotId, newPlayer): { assignments, bench }`, `signToBench(bench, newPlayer): bench`.

- [ ] **Step 1: Write the failing test**

`src/engine/squad.test.js`:

```js
// @vitest-environment node
import { describe, it, expect } from "vitest";
import { makeMiniDataset } from "../../tests/fixtures/miniDataset.js";
import { createSquadLookup } from "./players.js";
import { makeInitialAssignments } from "./formations.js";
import { nextEmptySlotIndex, autoFillBench, generateShortlist, signToSlot, signToBench } from "./squad.js";

const dataset = makeMiniDataset();
const getSquad = createSquadLookup(dataset);
const entry = (player) => ({ player, role: null, duty: null });

describe("squad", () => {
  it("finds the next empty slot", () => {
    const empty = makeInitialAssignments("4-3-3");
    expect(nextEmptySlotIndex(empty)).toBe(0);
    const squad = getSquad("2000", "1");
    expect(nextEmptySlotIndex(empty.map((a, i) => ({ ...a, player: squad[i] })))).toBe(-1);
  });

  it("auto-fills a bench of 6 from the drafted club-seasons: backup keeper first, then best outfielders", () => {
    const squad = getSquad("2000", "1");
    const assignments = makeInitialAssignments("4-3-3").map((a, i) => ({ ...a, player: squad[i + 1] }));
    const drafted = new Set(assignments.map((a) => a.player.id));
    const { bench, draftedIds } = autoFillBench(getSquad, assignments, drafted);
    expect(bench).toHaveLength(6);
    expect(bench[0].player.slot).toBe("GK");
    const outfield = bench.slice(1).map((b) => b.player.ov);
    expect([...outfield].sort((a, b) => b - a)).toEqual(outfield);
    for (const b of bench) {
      expect(drafted.has(b.player.id)).toBe(false);
      expect(draftedIds.has(b.player.id)).toBe(true);
    }
  });

  it("builds a shortlist from the chosen era, excluding owned players", () => {
    const owned = new Set(getSquad("2000", "1").slice(0, 5).map((p) => p.id));
    const list = generateShortlist(getSquad, dataset.index, { eraMin: 2000, eraMax: 2001 }, owned);
    expect(list).toHaveLength(5);
    for (const p of list) {
      expect(owned.has(p.id)).toBe(false);
      expect(["2000", "2001"]).toContain(p.seasonKey.split("_")[0]);
    }
  });

  it("signs to the bench, replacing the weakest when it's full", () => {
    const squad = getSquad("2001", "2");
    const six = squad.slice(0, 6).map(entry);
    const newcomer = getSquad("2006", "3")[0];
    expect(signToBench(six.slice(0, 5), newcomer)).toHaveLength(6);
    const weakest = six.reduce((min, b) => (b.player.ov < min.player.ov ? b : min));
    const after = signToBench(six, newcomer);
    expect(after).toHaveLength(6);
    expect(after.map((b) => b.player.id)).not.toContain(weakest.player.id);
    expect(after.map((b) => b.player.id)).toContain(newcomer.id);
  });

  it("signs into the XI with default role/duty and sends the old player to the bench", () => {
    const squad = getSquad("2000", "1");
    const assignments = makeInitialAssignments("4-3-3").map((a, i) => ({ ...a, player: squad[i], role: "X", duty: "Y", sliderAtt: 80 }));
    const newcomer = getSquad("2011", "4")[18];
    const outgoing = assignments.find((a) => a.slotId === "ST").player;
    const result = signToSlot(assignments, [], "ST", newcomer);
    const st = result.assignments.find((a) => a.slotId === "ST");
    expect(st).toMatchObject({ player: newcomer, role: "POA", duty: "Attack", sliderAtt: 50, sliderDef: 50 });
    expect(result.bench).toEqual([entry(outgoing)]);
  });
});
```

Run: `npx vitest run src/engine/squad.test.js`
Expected: FAIL — cannot resolve `./squad.js`.

- [ ] **Step 2: Move and adjust the code**

`src/engine/squad.js` — move `nextEmptySlotIndex`, `signToSlot`, `signToBench` verbatim; replace `autoFillBench` and `generateShortlist` with these parameterised versions (bodies otherwise identical to v1):

```js
import { defaultRoleFor, defaultDutyFor } from "./roles.js";

// Once the starting XI is complete, automatically pull a bench from the same
// club-seasons that were drafted from (a backup keeper first, then the best
// remaining outfield players).
export function autoFillBench(getSquad, assignments, draftedIds) {
  const usedSeasons = [...new Set(assignments.map((a) => a.player.seasonKey))];
  const dids = new Set(draftedIds);
  let remaining = [];
  usedSeasons.forEach((sk) => {
    const [year, clubId] = sk.split("_");
    getSquad(year, clubId).forEach((p) => { if (!dids.has(p.id)) remaining.push(p); });
  });
  const gk = remaining.filter((p) => p.slot === "GK").sort((a, b) => b.ov - a.ov)[0];
  const others = remaining.filter((p) => p.slot !== "GK").sort((a, b) => b.ov - a.ov);
  const bench = [];
  if (gk) { bench.push(gk); dids.add(gk.id); }
  for (const p of others) {
    if (bench.length >= 6) break;
    if (dids.has(p.id)) continue;
    bench.push(p); dids.add(p.id);
  }
  return { bench: bench.map((p) => ({ player: p, role: null, duty: null })), draftedIds: dids };
}

// Transfer window shortlist: candidates drawn from the career's era, excluding
// anyone already at the club. Sampling 40 club-seasons keeps it instant.
export function generateShortlist(getSquad, index, { eraMin, eraMax }, ownedIds, count = 5) {
  const eraEntries = index.filter((e) => {
    const y = parseInt(e.y, 10);
    return y >= eraMin && y <= eraMax;
  });
  const sampled = [...eraEntries].sort(() => Math.random() - 0.5).slice(0, 40);
  const pool = [];
  const seen = new Set();
  sampled.forEach((e) => {
    getSquad(e.y, e.c).forEach((p) => {
      if (!ownedIds.has(p.id) && !seen.has(p.id)) { seen.add(p.id); pool.push(p); }
    });
  });
  return [...pool].sort(() => Math.random() - 0.5).slice(0, count);
}
```

In `src/App.jsx` reducer:
- `PICK_PLAYER`: `autoFillBench(assignments, draftedIds)` → `autoFillBench(getSquad, assignments, draftedIds)`
- `GOTO_TRANSFER`: `generateShortlist(state.eraMin, state.eraMax, state.draftedIds)` → `generateShortlist(getSquad, DATASET.index, { eraMin: state.eraMin, eraMax: state.eraMax }, state.draftedIds)`

Add import:

```js
import { nextEmptySlotIndex, autoFillBench, generateShortlist, signToSlot, signToBench } from "./engine/squad.js";
```

After this task the top of `src/App.jsx` holds only imports, the temporary `DATASET` / `getSquad` / `CHAMPIONSHIP_POOL` globals with `installDataset`, `makeInitialState`, and the reducer, followed by the UI. Confirm with:

Run: `grep -nE "^(export )?(function|const|let) " src/App.jsx | head -12`
Expected: `DATASET`, `getSquad`, `installDataset`, `CHAMPIONSHIP_POOL`, `makeInitialState`, `reducer`, then `StatPip`.

- [ ] **Step 3: Verify**

Run: `npx vitest run src/engine/squad.test.js`
Expected: PASS, 5 tests.

Run: `npm run lint && npm test && npm run build && npm run e2e`
Expected: all green, 4 lint warnings.

- [ ] **Step 4: Commit**

```bash
git add src/engine src/App.jsx
git commit -m "Extract squad engine module" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Seeded random-number generator

**Files:**
- Create: `src/engine/rng.js`, `src/engine/rng.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `createRng(seed: number): Rng` where `Rng = { next(): number /* [0,1) */, int(n): number /* 0..n-1 */, pick<T>(arr: T[]): T, shuffle<T>(arr: T[]): T[] /* Fisher–Yates, returns a new array */ }`. `next` is mulberry32 and produces the same sequence as `mulberry32` in `scripts/capture-golden.mjs`.
  - `deriveSeed(careerSeed: number, counter: number): number` (unsigned 32-bit).

- [ ] **Step 1: Write the failing test**

`src/engine/rng.test.js`:

```js
// @vitest-environment node
import { describe, it, expect } from "vitest";
import { createRng, deriveSeed } from "./rng.js";
import { mulberry32 } from "../../scripts/capture-golden.mjs";

describe("createRng", () => {
  it("is mulberry32 and repeats exactly for the same seed", () => {
    const a = createRng(42);
    const b = createRng(42);
    const reference = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const value = a.next();
      expect(value).toBe(b.next());
      expect(value).toBe(reference());
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
    expect(createRng(43).next()).not.toBe(createRng(42).next());
  });

  it("int and pick stay in range", () => {
    const rng = createRng(7);
    for (let i = 0; i < 500; i++) {
      const n = rng.int(5);
      expect(Number.isInteger(n) && n >= 0 && n < 5).toBe(true);
    }
    const items = ["a", "b", "c"];
    for (let i = 0; i < 50; i++) expect(items).toContain(rng.pick(items));
  });

  it("shuffle returns a permutation without modifying its input", () => {
    const input = [1, 2, 3, 4, 5, 6];
    const copy = [...input];
    const out = createRng(3).shuffle(input);
    expect(input).toEqual(copy);
    expect(out).not.toBe(input);
    expect([...out].sort((x, y) => x - y)).toEqual(copy);
  });

  it("shuffle is fair (each position equally likely)", () => {
    const rng = createRng(12345);
    const counts = Array.from({ length: 5 }, () => new Array(5).fill(0));
    const trials = 10000;
    for (let t = 0; t < trials; t++) {
      rng.shuffle([0, 1, 2, 3, 4]).forEach((value, position) => { counts[value][position]++; });
    }
    // Expected 2000 per cell; chi-square with 16 degrees of freedom stays well under 40 for a fair shuffle.
    let chiSquare = 0;
    for (const row of counts) for (const c of row) chiSquare += (c - trials / 5) ** 2 / (trials / 5);
    expect(chiSquare).toBeLessThan(40);
  });
});

describe("deriveSeed", () => {
  it("is deterministic, unsigned 32-bit, and differs for neighbouring counters", () => {
    expect(deriveSeed(99, 0)).toBe(deriveSeed(99, 0));
    const seeds = new Set();
    for (let counter = 0; counter < 1000; counter++) {
      const s = deriveSeed(2893411307, counter);
      expect(Number.isInteger(s) && s >= 0 && s <= 0xffffffff).toBe(true);
      seeds.add(s);
    }
    expect(seeds.size).toBe(1000);
    expect(createRng(deriveSeed(1, 0)).next()).not.toBe(createRng(deriveSeed(1, 1)).next());
  });
});
```

Run: `npx vitest run src/engine/rng.test.js`
Expected: FAIL — cannot resolve `./rng.js`.

- [ ] **Step 2: Implement**

`src/engine/rng.js`:

```js
// Seeded randomness. Every random decision in the engine takes an Rng so a
// career replays exactly from its seed.
export function createRng(seed) {
  let a = seed >>> 0;

  function next() {
    // mulberry32
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    int(n) {
      return Math.floor(next() * n);
    },
    pick(arr) {
      return arr[Math.floor(next() * arr.length)];
    },
    shuffle(arr) {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
  };
}

// splitmix32-style mix so consecutive counters give unrelated streams.
export function deriveSeed(careerSeed, counter) {
  let z = (careerSeed ^ Math.imul(counter + 1, 0x9e3779b9)) >>> 0;
  z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
  z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
  return (z ^ (z >>> 16)) >>> 0;
}
```

- [ ] **Step 3: Verify**

Run: `npx vitest run src/engine/rng.test.js`
Expected: PASS, 5 tests.

Run: `npm run lint && npm test`
Expected: green.

- [ ] **Step 4: Commit**

```bash
git add src/engine/rng.js src/engine/rng.test.js
git commit -m "Add seeded random-number generator" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: Pass the rng through the engine and re-record season goldens

**Files:**
- Modify: `src/engine/match.js`, `src/engine/season.js`, `src/engine/league.js`, `src/engine/squad.js`, `src/engine/season.test.js`, `src/engine/squad.test.js`, `tests/unit/golden-seasons.test.js`, `scripts/capture-golden.mjs`, `tests/golden/seasons.json`, `tests/golden/league.json`, `tests/golden/README.md`, `eslint.config.js`, `src/App.jsx`

**Interfaces:**
- Consumes: `createRng` (Task 9).
- Produces (every random engine function now takes an `Rng` and never calls `Math.random`):
  - `poissonSample(lambda, rng)`, `simulateMatch(profile, opp, isHome, familiarity, rng)`
  - `estimateClubPoints(opp, rng)`, `simulateSeason(profile, familiarity, opponents, rng)`
  - `drawPromotedClubs(pool, count, currentNames, rng)`, `applyPromotionRelegation(opponents, table, pool, rng)`
  - `generateShortlist(getSquad, index, { eraMin, eraMax }, ownedIds, rng, count = 5)`
  - `node scripts/capture-golden.mjs --engine` re-records `seasons.json` and `league.json` from `src/engine`, reusing the inputs already stored in `seasons.json`.

- [ ] **Step 1: Update the tests first**

`tests/unit/golden-seasons.test.js` — replace the imports of `withSeededMathRandom` with `import { createRng } from "../../src/engine/rng.js";` and change the two calls to:

```js
    const result = simulateSeason(entry.profile, entry.familiarity, players.opponents, createRng(seed));
```

```js
    const result = applyPromotionRelegation(players.opponents, entry.table, championship, createRng(seed));
```

`src/engine/season.test.js` — add `import { createRng } from "./rng.js";` and `import { simulateSeason } from "./season.js";` (merge into the existing import), pass `createRng(1)` as the last argument to both `applyPromotionRelegation` calls, and add:

```js
describe("simulateSeason with an rng", () => {
  const opponents = Array.from({ length: 19 }, (_, i) => ({ name: `Rival ${i + 1}`, ov: 70 + i, histMean: 72, weight: 1, vol: 8 }));
  const profile = { attack: 80, defense: 78, defSolidity: 76, buildup: 70, press: 70, creativity: 72, physical: 75 };

  it("replays exactly for the same seed and differs for another", () => {
    const a = simulateSeason(profile, 65, opponents, createRng(9));
    const b = simulateSeason(profile, 65, opponents, createRng(9));
    const c = simulateSeason(profile, 65, opponents, createRng(10));
    expect(b).toEqual(a);
    expect(c.matches.map((m) => `${m.gf}-${m.ga}`)).not.toEqual(a.matches.map((m) => `${m.gf}-${m.ga}`));
  });
});
```

`src/engine/squad.test.js` — add `import { createRng } from "./rng.js";` and change the shortlist call to `generateShortlist(getSquad, dataset.index, { eraMin: 2000, eraMax: 2001 }, owned, createRng(7))`.

Run: `npm test`
Expected: FAIL — golden season/league tests fail (wrong results), the replay test fails (`Math.random` is still used, so runs differ).

- [ ] **Step 2: Thread the rng through the engine**

`src/engine/match.js` — change these lines only:

```js
export function poissonSample(lambda, rng) {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= rng.next(); } while (p > L && k < 12);
  return k - 1;
}
```

In `simulateMatch`, the signature becomes `simulateMatch(profile, opp, isHome, familiarity, rng)`, the two noise lines use `rng.next()` in place of `Math.random()`, and the return becomes `return { gf: poissonSample(noisyFor, rng), ga: poissonSample(noisyAgainst, rng) };`.

`src/engine/season.js`:
- `estimateClubPoints(opp, rng)`: `const noise = (rng.next() - 0.5) * opp.vol;`
- `simulateSeason(profile, familiarity, oppList, rng)`:
  - `const shuffledNames = rng.shuffle(oppList).map((o) => o.name);`
  - `const res = simulateMatch(profile, nameToOpp[fx.name], fx.home, familiarity, rng);`
  - `const table = oppList.map((o) => ({ name: o.name, pts: estimateClubPoints(o, rng), isUser: false }));`

`src/engine/league.js`:

```js
export function drawPromotedClubs(pool, count, currentNames, rng) {
  const available = pool.filter((c) => !currentNames.has(c.name));
  return rng.shuffle(available).slice(0, count).map((c) => ({ ...c, lastSeason: "promoted" }));
}
```

and in `applyPromotionRelegation(opponents, table, pool, rng)` pass `rng` to `drawPromotedClubs(pool, relegatedNames.length, currentNames, rng)`.

`src/engine/squad.js` — `generateShortlist(getSquad, index, { eraMin, eraMax }, ownedIds, rng, count = 5)`:
- `const sampled = rng.shuffle(eraEntries).slice(0, 40);`
- `return rng.shuffle(pool).slice(0, count);`

- [ ] **Step 3: Temporary per-action rng in the reducer**

In `src/App.jsx` add `import { createRng } from "./engine/rng.js";` and, above the reducer:

```js
// Temporary until Task 12 stores a career seed in state.
function freshRng() {
  return createRng(crypto.getRandomValues(new Uint32Array(1))[0]);
}
```

- `SIMULATE`: `simulateSeason(profile, familiarity, state.opponents, freshRng())`
- `GOTO_TRANSFER`: `const rng = freshRng();` then `generateShortlist(getSquad, DATASET.index, { eraMin: state.eraMin, eraMax: state.eraMax }, state.draftedIds, rng)` and `applyPromotionRelegation(state.opponents, state.simulation?.table, CHAMPIONSHIP_POOL, rng)`
- In `FMWeb`'s `onDoneSpin`: `const r = eraIndex[freshRng().int(eraIndex.length)];`
- In `WheelSpinner`, directly above `const r = idx[Math.floor(Math.random() * idx.length)];` add:

```js
      // eslint-disable-next-line no-restricted-properties -- cosmetic flicker only; the real result comes from the reducer
```

- [ ] **Step 4: Ban `Math.random` in `src/`**

Append to the exported array in `eslint.config.js`:

```js
  {
    files: ["src/**/*.{js,jsx}"],
    rules: {
      "no-restricted-properties": ["error", {
        object: "Math", property: "random",
        message: "Use an Rng from src/engine/rng.js so results replay from the career seed.",
      }],
    },
  },
```

Run: `npm run lint`
Expected: 0 errors (4 known warnings). `grep -rn "Math.random" src` shows only the `WheelSpinner` line.

- [ ] **Step 5: Add engine mode to the capture script**

In `scripts/capture-golden.mjs` add `readFileSync` to the `node:fs` import and add:

```js
async function recordFromEngine(outDir) {
  const { simulateSeason } = await import("../src/engine/season.js");
  const { applyPromotionRelegation } = await import("../src/engine/league.js");
  const { createRng } = await import("../src/engine/rng.js");
  const players = JSON.parse(readFileSync("src/data/players.json", "utf8"));
  const championship = JSON.parse(readFileSync("src/data/championship.json", "utf8"));
  const inputs = JSON.parse(readFileSync("tests/golden/seasons.json", "utf8"));
  const seasons = inputs.map(({ seed, xiIndex, style, familiarity, profile }) => ({
    seed, xiIndex, style, familiarity, profile,
    result: simulateSeason(profile, familiarity, players.opponents, createRng(seed)),
  }));
  const league = seasons.map((s) => ({
    seed: 1000 + s.seed,
    table: s.result.table,
    result: applyPromotionRelegation(players.opponents, s.result.table, championship, createRng(1000 + s.seed)),
  }));
  writeGolden(outDir, { "seasons.json": seasons, "league.json": league });
}
```

Change `main` to `async function main()`, and at its start:

```js
  if (args.includes("--engine")) {
    await recordFromEngine(outDir);
    return;
  }
```

Change the last line to `if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();`.

Add script `"golden:engine": "node scripts/capture-golden.mjs --engine"`.

- [ ] **Step 6: Re-record and verify**

Run:

```bash
npm run golden:engine
git diff --stat tests/golden
```

Expected: only `seasons.json` and `league.json` changed; `xis.json` and `profiles.json` untouched.

Run: `npm test && npm run build && npm run e2e`
Expected: all green (golden tests now use `createRng`; replay test passes).

Update the second bullet of `tests/golden/README.md` to note: "Re-recorded 2026-09 by `npm run golden:engine` when the engine switched to an explicit seeded rng and Fisher–Yates shuffles (Task 10)."

- [ ] **Step 7: Commit (only this change and the regenerated files)**

```bash
git add src/engine src/App.jsx eslint.config.js scripts/capture-golden.mjs package.json tests/golden tests/unit/golden-seasons.test.js
git commit -m "Use a seeded rng and Fisher-Yates shuffles in the engine" -m "Season and league golden files are re-recorded: v1 shuffled with a biased sort(() => Math.random() - 0.5), so seeded results necessarily change. Profiles are unchanged." -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: Move state out of `App.jsx` — `createReducer(dataset)`

**Files:**
- Create: `src/state/initialState.js`, `src/state/reducer.js`, `src/state/selectors.js`, `src/state/selectors.test.js`, `tests/fixtures/playCareer.js`, `tests/unit/reducer-career.test.js`
- Modify: `src/App.jsx`, `src/main.jsx`

**Interfaces:**
- Consumes: all engine modules; `makeMiniDataset()`.
- Produces:
  - `makeInitialState(dataset): GameState` (same fields as v1's `initialState`, `opponents: dataset.opponents`).
  - `createReducer(dataset): (state, action) => GameState` — owns a private `getSquad = createSquadLookup(dataset)`.
  - `selectEraIndex(index, eraMin, eraMax)`, `liveAssignments(assignments)` (role keys → role objects, `null` when unset or unknown), `selectFamiliarity(live, instructions, formationKey)`, `selectProfile(live, instructions, familiarity)`.
  - `playCareer({ reducer, initialState, index, seasons = 6, check })` in `tests/fixtures/playCareer.js`, returning the final state and calling `check(state, action, previousState)` after every dispatch.
  - `FMWeb` takes a `dataset` prop. `installDataset` and all `App.jsx` data globals are deleted.

- [ ] **Step 1: Write the career helper and failing tests**

`tests/fixtures/playCareer.js`:

```js
// Drives the reducer through a whole career the way a player would.
export function playCareer({ reducer, initialState, index, seasons = 6, check = () => {} }) {
  let state = initialState;
  let step = 0;
  const dispatch = (action) => {
    const previous = state;
    state = reducer(state, action);
    step++;
    check(state, action, previous);
  };

  dispatch({ type: "SET_ERA", min: 2000, max: 2011 });
  dispatch({ type: "START_DRAFT" });
  while (!state.draftDone) {
    dispatch({ type: "SPIN" });
    const entry = index[step % index.length];
    dispatch({ type: "LAND", year: entry.y, clubId: entry.c, label: entry.label });
    if (state.pool.length === 0) throw new Error(`Empty draft pool after ${step} actions`);
    dispatch({ type: "PICK_PLAYER", player: state.pool[0] });
  }
  dispatch({ type: "SKIP_TO_TACTICS" });
  dispatch({ type: "SET_STYLE", key: "gegenpress" });

  for (let season = 1; season <= seasons; season++) {
    dispatch({ type: "SIMULATE" });
    dispatch({ type: "KICKOFF" });
    if (season === seasons) break;
    dispatch({ type: "GOTO_TRANSFER" });
    dispatch({ type: "SIGN_SHORTLIST_TO_BENCH", index: 0 });
    dispatch({ type: "SIGN_SHORTLIST_TO_XI", index: 1, slotId: "ST" });
    dispatch({ type: "CONTINUE_SEASON" });
  }
  return state;
}
```

`tests/unit/reducer-career.test.js`:

```js
// @vitest-environment node
import { describe, it, expect } from "vitest";
import { makeMiniDataset } from "../fixtures/miniDataset.js";
import { playCareer } from "../fixtures/playCareer.js";
import { createReducer } from "../../src/state/reducer.js";
import { makeInitialState } from "../../src/state/initialState.js";

export function checkInvariants(state, action) {
  const label = action.type;
  expect(state.assignments, label).toHaveLength(11);
  expect(state.bench.length, label).toBeLessThanOrEqual(6);
  const ids = [...state.assignments, ...state.bench].map((e) => e.player?.id).filter(Boolean);
  expect(new Set(ids).size, label).toBe(ids.length);
  expect(state.opponents, label).toHaveLength(19);
}

describe("reducer career walkthrough", () => {
  it("plays six seasons keeping squad and league invariants after every action", () => {
    const dataset = makeMiniDataset();
    const final = playCareer({
      reducer: createReducer(dataset),
      initialState: makeInitialState(dataset),
      index: dataset.index,
      check: checkInvariants,
    });
    expect(final.season).toBe(6);
    expect(final.phase).toBe("result");
    expect(final.simulation.season).toBe(6);
    expect(final.simulation.matches).toHaveLength(38);
  });

  it("SET_FORMATION empties the squad but keeps the era", () => {
    const dataset = makeMiniDataset();
    const reducer = createReducer(dataset);
    let state = reducer(makeInitialState(dataset), { type: "SET_ERA", min: 2000, max: 2005 });
    state = reducer(state, { type: "SET_FORMATION", key: "4-4-2" });
    expect(state.formationKey).toBe("4-4-2");
    expect(state.assignments.every((a) => a.player === null)).toBe(true);
    expect([state.eraMin, state.eraMax]).toEqual([2000, 2005]);
  });
});
```

`src/state/selectors.test.js`:

```js
// @vitest-environment node
import { describe, it, expect } from "vitest";
import { selectEraIndex, liveAssignments } from "./selectors.js";

describe("selectors", () => {
  it("filters the club-season index to the era", () => {
    const index = [{ y: "1999", c: "1" }, { y: "2000", c: "1" }, { y: "2011", c: "2" }, { y: "2012", c: "2" }];
    expect(selectEraIndex(index, 2000, 2011).map((e) => e.y)).toEqual(["2000", "2011"]);
  });

  it("turns role keys into role objects", () => {
    const live = liveAssignments([
      { type: "ST", role: "POA" },
      { type: "ST", role: null },
      { type: "ST", role: "NOPE" },
    ]);
    expect(live[0].role.label).toBe("Poacher");
    expect(live[1].role).toBeNull();
    expect(live[2].role).toBeNull();
  });
});
```

Run: `npx vitest run tests/unit/reducer-career.test.js src/state`
Expected: FAIL — cannot resolve `../../src/state/reducer.js`.

- [ ] **Step 2: Create the state modules**

`src/state/initialState.js`:

```js
import { makeInitialAssignments } from "../engine/formations.js";
import { DEFAULT_INSTRUCTIONS } from "../engine/instructions.js";

export function makeInitialState(dataset) {
  return {
    phase: "formation", // formation | draft | tactics | reveal | result | transfer
    formationKey: "4-3-3",
    assignments: makeInitialAssignments("4-3-3"),
    bench: [], // { player, role, duty } - auto-filled once starting XI is complete
    draftDone: false,
    draftedIds: new Set(),
    wheel: { spinning: false, landed: null },
    pool: [],
    instructions: { ...DEFAULT_INSTRUCTIONS },
    selectedStyle: null,
    eraMin: 1992,
    eraMax: 2024,
    simulation: null,
    season: 1, // 1 = 2026-27, up to 6 = 2031-32, then the career ends
    shortlist: [], // { player, signed }[] — current transfer window's 5 candidates
    opponents: dataset.opponents, // evolves each season via promotion/relegation
    lastTransition: null, // { relegated: [names], promoted: [names] } from the season just gone
  };
}
```

`src/state/selectors.js`:

```js
import { ROLES } from "../engine/roles.js";
import { computeFamiliarity } from "../engine/familiarity.js";
import { computeTeamProfile } from "../engine/tactics.js";

export function selectEraIndex(index, eraMin, eraMax) {
  return index.filter((e) => {
    const y = parseInt(e.y, 10);
    return y >= eraMin && y <= eraMax;
  });
}

export function liveAssignments(assignments) {
  return assignments.map((a) => ({
    ...a,
    role: a.role ? (ROLES[a.type].find((r) => r.key === a.role) || null) : null,
  }));
}

export function selectFamiliarity(live, instructions, formationKey) {
  return computeFamiliarity(live, instructions, formationKey);
}

export function selectProfile(live, instructions, familiarity) {
  return computeTeamProfile(live, instructions, familiarity);
}
```

`src/state/reducer.js` — cut `freshRng` and the whole `reducer` function out of `src/App.jsx` and wrap it like this:

```js
import { clamp } from "../engine/util.js";
import { FORMATIONS, makeInitialAssignments } from "../engine/formations.js";
import { ROLES, defaultRoleFor, defaultDutyFor } from "../engine/roles.js";
import { STYLE_PRESETS } from "../engine/instructions.js";
import { createSquadLookup, buildPool } from "../engine/players.js";
import { computeTeamProfile } from "../engine/tactics.js";
import { computeFamiliarity } from "../engine/familiarity.js";
import { simulateSeason } from "../engine/season.js";
import { applyPromotionRelegation } from "../engine/league.js";
import { nextEmptySlotIndex, autoFillBench, generateShortlist, signToSlot, signToBench } from "../engine/squad.js";
import { createRng } from "../engine/rng.js";
import { makeInitialState } from "./initialState.js";

// Temporary until Task 12 stores a career seed in state.
function freshRng() {
  return createRng(crypto.getRandomValues(new Uint32Array(1))[0]);
}

export function createReducer(dataset) {
  const getSquad = createSquadLookup(dataset);

  return function reducer(state, action) {
    switch (action.type) {
      // ← paste every case from App.jsx's reducer here, unchanged except:
      //   makeInitialState()      → makeInitialState(dataset)
      //   DATASET.index           → dataset.index
      //   CHAMPIONSHIP_POOL       → dataset.championship
    }
  };
}
```

After pasting, the `switch` contains the cases `SET_FORMATION`, `SET_ERA`, `START_DRAFT`, `SPIN`, `LAND`, `PICK_PLAYER`, `SKIP_TO_TACTICS`, `SET_ROLE`, `SET_DUTY`, `SET_SLIDER`, `SET_INSTRUCTION`, `SET_STYLE`, `MOVE_PLAYER`, `RESET_POSITIONS`, `SWAP_PLAYERS`, `SIMULATE`, `KICKOFF`, `GOTO_TRANSFER`, `SIGN_SHORTLIST_TO_BENCH`, `SIGN_SHORTLIST_TO_XI`, `CONTINUE_SEASON`, `RESET` and `default: return state;` — no comment placeholder remains.

- [ ] **Step 3: Make `App.jsx` use the state modules**

In `src/App.jsx`:

1. Delete `let DATASET`, `let getSquad`, `installDataset`, `let CHAMPIONSHIP_POOL`, `makeInitialState` and the (now moved) `reducer` / `freshRng`.
2. Replace the import block with:

```js
import React, { useReducer, useMemo, useState, useEffect, useRef } from "react";
import { clamp, seasonLabel } from "./engine/util.js";
import { FORMATIONS, SLOT_TYPE_LABEL } from "./engine/formations.js";
import { ROLES, DUTY_INFO } from "./engine/roles.js";
import { STYLE_PRESETS } from "./engine/instructions.js";
import { STAT_KEYS, STAT_LABELS } from "./engine/players.js";
import { playerContribution } from "./engine/tactics.js";
import { familiarityLabel } from "./engine/familiarity.js";
import { tacticalReadout, mentalityLabel } from "./engine/readout.js";
import { CAREER_SEASONS, careerSeasonLabel } from "./engine/season.js";
import { nextEmptySlotIndex } from "./engine/squad.js";
import { createRng } from "./engine/rng.js";
import { createReducer } from "./state/reducer.js";
import { makeInitialState } from "./state/initialState.js";
import { selectEraIndex, liveAssignments, selectFamiliarity, selectProfile } from "./state/selectors.js";
```

3. `DraftScreen`: add `eraIndex` to its props and delete its own `const eraIndex = useMemo(() => DATASET.index.filter(...), [eraMin, eraMax]);`.
4. In `FMWeb`, change the signature to `export default function FMWeb({ dataset })` and replace the reducer/selector lines:

```jsx
  const reducer = useMemo(() => createReducer(dataset), [dataset]);
  const [state, dispatch] = useReducer(reducer, dataset, makeInitialState);
```

```jsx
  const live = useMemo(() => liveAssignments(assignments), [assignments]);
  const familiarity = useMemo(() => selectFamiliarity(live, instructions, formationKey), [live, instructions, formationKey]);
  const profile = useMemo(() => selectProfile(live, instructions, familiarity), [live, instructions, familiarity]);
  const eraIndex = useMemo(() => selectEraIndex(dataset.index, state.eraMin, state.eraMax), [dataset, state.eraMin, state.eraMax]);
```

   (These replace the old `liveAssignments`, `familiarity`, `profile` and `eraIndex` `useMemo`s.)
5. Pass `eraIndex={eraIndex}` to `<DraftScreen … />`.
6. In `onDoneSpin`: `const r = eraIndex[createRng(crypto.getRandomValues(new Uint32Array(1))[0]).int(eraIndex.length)];` (temporary until Task 12).

`src/main.jsx` — import only the default export (`import FMWeb from "./App.jsx";`) and render `{(dataset) => <FMWeb dataset={dataset} />}` inside `DatasetGate`.

- [ ] **Step 4: Verify**

Run: `npx vitest run tests/unit/reducer-career.test.js src/state`
Expected: PASS (2 + 2 tests).

Run: `grep -rnE "installDataset|DATASET\.|CHAMPIONSHIP_POOL" src`
Expected: no output.

Run: `npm run lint && npm test && npm run build && npm run e2e`
Expected: all green, exactly 4 lint warnings.

- [ ] **Step 5: Commit**

```bash
git add src/state src/App.jsx src/main.jsx tests/fixtures/playCareer.js tests/unit/reducer-career.test.js
git commit -m "Move game state into createReducer(dataset)" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 12: Career seed, rng counter, reducer-driven wheel, NEW_GAME

**Files:**
- Create: `src/state/rngState.js`, `src/state/rngState.test.js`, `tests/unit/reducer-determinism.test.js`
- Modify: `src/state/initialState.js`, `src/state/reducer.js`, `tests/fixtures/playCareer.js`, `tests/unit/reducer-career.test.js`, `src/App.jsx`

**Interfaces:**
- Consumes: `createRng`, `deriveSeed` (Task 9); `selectEraIndex` (Task 11).
- Produces:
  - `newCareerSeed(): number` (crypto, unsigned 32-bit) and `takeRng(state): [Rng, GameState]` (returned state has `rngCounter + 1`; input not modified).
  - `makeInitialState(dataset, careerSeed): GameState` — adds `careerSeed` and `rngCounter: 0`.
  - Actions: `{ type: "LAND" }` without payload, setting `wheel.landed = { year, clubId, label }`; `{ type: "NEW_GAME", seed }` replacing `RESET`; `SET_FORMATION` keeps `careerSeed`, `rngCounter`, `eraMin`, `eraMax`.
  - `playCareer` dispatches `{ type: "LAND" }` (its `index` option is removed).

- [ ] **Step 1: Write the failing tests**

`src/state/rngState.test.js`:

```js
// @vitest-environment node
import { describe, it, expect } from "vitest";
import { takeRng, newCareerSeed } from "./rngState.js";

describe("rngState", () => {
  it("takeRng returns a replayable rng and increments the counter without mutating", () => {
    const state = { careerSeed: 123, rngCounter: 4, other: "x" };
    const [a, next] = takeRng(state);
    const [b] = takeRng(state);
    expect(next).toEqual({ careerSeed: 123, rngCounter: 5, other: "x" });
    expect(state.rngCounter).toBe(4);
    expect(a.next()).toBe(b.next());
    expect(takeRng(next)[0].next()).not.toBe(takeRng(state)[0].next());
  });

  it("newCareerSeed gives unsigned 32-bit integers", () => {
    for (let i = 0; i < 20; i++) {
      const seed = newCareerSeed();
      expect(Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff).toBe(true);
    }
  });
});
```

`tests/unit/reducer-determinism.test.js`:

```js
// @vitest-environment node
import { describe, it, expect } from "vitest";
import { makeMiniDataset } from "../fixtures/miniDataset.js";
import { playCareer } from "../fixtures/playCareer.js";
import { createReducer } from "../../src/state/reducer.js";
import { makeInitialState } from "../../src/state/initialState.js";

function run(seed) {
  const dataset = makeMiniDataset();
  return playCareer({ reducer: createReducer(dataset), initialState: makeInitialState(dataset, seed) });
}

describe("reducer determinism", () => {
  it("replays an identical six-season career from the same seed", () => {
    expect(run(2024)).toEqual(run(2024));
  });

  it("produces a different career from a different seed", () => {
    expect(run(1).simulation.matches).not.toEqual(run(2).simulation.matches);
  });
});
```

In `tests/unit/reducer-career.test.js`:
- pass `makeInitialState(dataset, 7)` (both tests) and drop `index: dataset.index`;
- add to `checkInvariants(state, action, previous)`: `expect(state.rngCounter, label).toBeGreaterThanOrEqual(previous.rngCounter);`
- add:

```js
  it("NEW_GAME starts over with the given seed", () => {
    const dataset = makeMiniDataset();
    const reducer = createReducer(dataset);
    const played = playCareer({ reducer, initialState: makeInitialState(dataset, 7), seasons: 1 });
    const fresh = reducer(played, { type: "NEW_GAME", seed: 99 });
    expect(fresh).toEqual(makeInitialState(dataset, 99));
  });
```

In `tests/fixtures/playCareer.js`: remove `index` from the options, and replace the two lines `const entry = …` / `dispatch({ type: "LAND", year: … })` with `dispatch({ type: "LAND" });`.

Run: `npm test`
Expected: FAIL — cannot resolve `./rngState.js`; career tests fail because `LAND` has no payload.

- [ ] **Step 2: Implement**

`src/state/rngState.js`:

```js
import { createRng, deriveSeed } from "../engine/rng.js";

export function newCareerSeed() {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

// Every random decision takes the next counter value, so a saved career
// always replays the same way.
export function takeRng(state) {
  const rng = createRng(deriveSeed(state.careerSeed, state.rngCounter));
  return [rng, { ...state, rngCounter: state.rngCounter + 1 }];
}
```

`src/state/initialState.js` — signature `makeInitialState(dataset, careerSeed)`; add as the first two fields:

```js
    careerSeed,
    rngCounter: 0,
```

`src/state/reducer.js` — remove `freshRng` and the `createRng` import; add `import { takeRng } from "./rngState.js";` and `import { selectEraIndex } from "./selectors.js";`. Replace these cases entirely:

```js
      case "SET_FORMATION": {
        return {
          ...makeInitialState(dataset, state.careerSeed),
          rngCounter: state.rngCounter,
          formationKey: action.key,
          assignments: makeInitialAssignments(action.key),
          eraMin: state.eraMin,
          eraMax: state.eraMax,
        };
      }
```

```js
      case "LAND": {
        const eraIndex = selectEraIndex(dataset.index, state.eraMin, state.eraMax);
        if (eraIndex.length === 0) return state;
        const [rng, next] = takeRng(state);
        const entry = rng.pick(eraIndex);
        const idx = nextEmptySlotIndex(state.assignments);
        let slotType = "GK", side = null;
        if (idx >= 0) { slotType = state.assignments[idx].type; side = state.assignments[idx].side; }
        const pool = buildPool(getSquad, entry.y, entry.c, slotType, side, state.draftedIds);
        return { ...next, wheel: { spinning: false, landed: { year: entry.y, clubId: entry.c, label: entry.label } }, pool };
      }
```

```js
      case "SIMULATE": {
        const [rng, next] = takeRng(state);
        const assignmentsWithRole = state.assignments.map((a) => ({
          ...a,
          roleObj: ROLES[a.type].find((r) => r.key === a.role),
        })).map((a) => ({ ...a, role: a.roleObj }));
        const familiarity = computeFamiliarity(assignmentsWithRole, state.instructions, state.formationKey);
        const profile = computeTeamProfile(assignmentsWithRole, state.instructions, familiarity);
        const simulation = simulateSeason(profile, familiarity, state.opponents, rng);
        // Ratings stay hidden through the draft and tactics phases — this is
        // the moment they're finally revealed, right before a ball is kicked.
        return { ...next, phase: "reveal", simulation: { ...simulation, profile, familiarity, instructions: state.instructions, season: state.season } };
      }
```

```js
      case "GOTO_TRANSFER": {
        const [rng, next] = takeRng(state);
        const shortlist = generateShortlist(getSquad, dataset.index, { eraMin: state.eraMin, eraMax: state.eraMax }, state.draftedIds, rng)
          .map((player) => ({ player, signed: false }));
        const { opponents, relegated, promoted } = applyPromotionRelegation(state.opponents, state.simulation?.table, dataset.championship, rng);
        return { ...next, phase: "transfer", shortlist, opponents, lastTransition: { relegated, promoted } };
      }
```

Replace `case "RESET": { … }` with:

```js
      case "NEW_GAME": {
        return makeInitialState(dataset, action.seed);
      }
```

`src/App.jsx`:
- Remove the `createRng` import; add `import { newCareerSeed } from "./state/rngState.js";`.
- `useReducer(reducer, dataset, makeInitialState)` → `useReducer(reducer, dataset, (ds) => makeInitialState(ds, newCareerSeed()))`.
- `onDoneSpin={() => dispatch({ type: "LAND" })}` (delete the random pick).
- `onReset={() => dispatch({ type: "RESET" })}` → `onReset={() => dispatch({ type: "NEW_GAME", seed: newCareerSeed() })}`.

- [ ] **Step 3: Verify**

Run: `npm test`
Expected: PASS, including 2 determinism tests and 3 career tests.

Run: `grep -rn "getRandomValues" src && grep -rn '"RESET"' src`
Expected: first command shows only `src/state/rngState.js`; second prints nothing.

Run: `npm run lint && npm run build && npm run e2e`
Expected: all green, 4 lint warnings.

- [ ] **Step 4: Commit**

```bash
git add src/state src/App.jsx tests/fixtures/playCareer.js tests/unit
git commit -m "Store a career seed and drive every random event from it" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 13: Player identity rule and `draftedIdentities`

**Files:**
- Create: `src/engine/identity.js`, `src/engine/identity.test.js`
- Modify: `src/state/initialState.js`, `src/state/reducer.js`, `tests/unit/reducer-career.test.js`

**Interfaces:**
- Consumes: `Player` (`name`, `nat`, `age`, `seasonKey`).
- Produces:
  - `playerIdentity(player): { name, nat, birthYear: number|null }` (`birthYear = seasonYear − age`; `null` when age is missing or 0).
  - `isSameRealPlayer(a: Identity, b: Identity): boolean` — same `name` and `nat`, and birth years within ±1; if either birth year is `null`, name + nat decides.
  - `isOwnedIdentity(identities: Identity[], player: Player): boolean`.
  - State field `draftedIdentities: Identity[]`, appended wherever `draftedIds` gains an id (`PICK_PLAYER` incl. auto-filled bench, `SIGN_SHORTLIST_TO_BENCH`, `SIGN_SHORTLIST_TO_XI`). Nothing is excluded by identity yet — that is bug #4 in Task 24.

- [ ] **Step 1: Write the failing tests**

`src/engine/identity.test.js`:

```js
// @vitest-environment node
import { describe, it, expect } from "vitest";
import { makeMiniDataset } from "../../tests/fixtures/miniDataset.js";
import { createSquadLookup } from "./players.js";
import { playerIdentity, isSameRealPlayer, isOwnedIdentity } from "./identity.js";

const getSquad = createSquadLookup(makeMiniDataset());
const find = (year, club, name) => getSquad(year, club).find((p) => p.name === name);

describe("player identity", () => {
  it("derives birth year from season and age", () => {
    expect(playerIdentity(find("2000", "1", "Sam Twice"))).toEqual({ name: "Sam Twice", nat: "Wales", birthYear: 1975 });
    expect(playerIdentity({ name: "No Age", nat: "Spain", age: 0, seasonKey: "2003_5" }).birthYear).toBeNull();
  });

  it("treats the same player in consecutive seasons as one person", () => {
    expect(isSameRealPlayer(playerIdentity(find("2000", "1", "Sam Twice")), playerIdentity(find("2001", "1", "Sam Twice")))).toBe(true);
  });

  it("allows one year of birthday drift but not more", () => {
    const base = { name: "X", nat: "England", birthYear: 1980 };
    expect(isSameRealPlayer(base, { ...base, birthYear: 1981 })).toBe(true);
    expect(isSameRealPlayer(base, { ...base, birthYear: 1982 })).toBe(false);
    expect(isSameRealPlayer(base, { ...base, nat: "Wales" })).toBe(false);
    expect(isSameRealPlayer(base, { ...base, birthYear: null })).toBe(true);
  });

  it("keeps two different people who share a name and nationality apart", () => {
    const older = playerIdentity(find("2000", "2", "Alan Smith"));
    const younger = playerIdentity(find("2010", "4", "Alan Smith"));
    expect([older.birthYear, younger.birthYear]).toEqual([1972, 1985]);
    expect(isSameRealPlayer(older, younger)).toBe(false);
    expect(isOwnedIdentity([older], find("2010", "4", "Alan Smith"))).toBe(false);
    expect(isOwnedIdentity([older], find("2000", "2", "Alan Smith"))).toBe(true);
  });
});
```

In `tests/unit/reducer-career.test.js`, add to `checkInvariants`:

```js
  expect(state.draftedIdentities, label).toHaveLength(state.draftedIds.size);
```

Run: `npm test`
Expected: FAIL — cannot resolve `./identity.js`; career test fails (`draftedIdentities` undefined).

- [ ] **Step 2: Implement**

`src/engine/identity.js`:

```js
// Player rows have no stable id across seasons. The same real person is
// recognised by name + nationality + birth year (season year − age), allowing
// ±1 year because age is measured on a fixed date each season. Checked against
// the dataset: 2,493 of 2,758 multi-season players have a stable birth year,
// 244 drift by exactly 1, and the 21 that differ by 2+ are different people.
export function playerIdentity(player) {
  const seasonYear = parseInt(String(player.seasonKey).split("_")[0], 10);
  const birthYear = player.age ? seasonYear - player.age : null;
  return { name: player.name, nat: player.nat, birthYear };
}

export function isSameRealPlayer(a, b) {
  if (a.name !== b.name || a.nat !== b.nat) return false;
  if (a.birthYear == null || b.birthYear == null) return true;
  return Math.abs(a.birthYear - b.birthYear) <= 1;
}

export function isOwnedIdentity(identities, player) {
  const identity = playerIdentity(player);
  return identities.some((owned) => isSameRealPlayer(owned, identity));
}
```

`src/state/initialState.js` — add `draftedIdentities: [],` directly after `draftedIds: new Set(),`.

`src/state/reducer.js` — add `import { playerIdentity } from "../engine/identity.js";` and update three cases.

`PICK_PLAYER` becomes:

```js
      case "PICK_PLAYER": {
        const idx = nextEmptySlotIndex(state.assignments);
        if (idx < 0) return state;
        const draftedIds = new Set(state.draftedIds);
        draftedIds.add(action.player.id);
        const draftedIdentities = [...state.draftedIdentities, playerIdentity(action.player)];
        const role = defaultRoleFor(state.assignments[idx].type);
        const duty = defaultDutyFor(role);
        const assignments = state.assignments.slice();
        assignments[idx] = { ...assignments[idx], player: action.player, role: role.key, duty };
        const draftDone = nextEmptySlotIndex(assignments) === -1;
        if (draftDone) {
          const { bench, draftedIds: withBench } = autoFillBench(getSquad, assignments, draftedIds);
          return {
            ...state, assignments, draftedIds: withBench,
            draftedIdentities: [...draftedIdentities, ...bench.map((b) => playerIdentity(b.player))],
            wheel: { spinning: false, landed: null }, pool: [], draftDone, bench,
          };
        }
        return { ...state, assignments, draftedIds, draftedIdentities, wheel: { spinning: false, landed: null }, pool: [], draftDone };
      }
```

In `SIGN_SHORTLIST_TO_BENCH` and `SIGN_SHORTLIST_TO_XI`, add `const draftedIdentities = [...state.draftedIdentities, playerIdentity(entry.player)];` next to the `draftedIds` line and include `draftedIdentities` in the returned object.

- [ ] **Step 3: Verify**

Run: `npm test`
Expected: PASS (identity 4 tests; career invariants hold after every action; determinism still passes).

Run: `npm run lint && npm run build && npm run e2e`
Expected: all green, 4 lint warnings.

- [ ] **Step 4: Commit**

```bash
git add src/engine/identity.js src/engine/identity.test.js src/state tests/unit/reducer-career.test.js
git commit -m "Track drafted player identities across seasons" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 14: Save format — serialise, validate, migrate, hydrate

**Files:**
- Create: `src/version.js`, `src/state/save.js`, `src/state/save.test.js`
- Modify: `vite.config.js`

**Interfaces:**
- Consumes: `FORMATIONS`, `careerSeasonLabel`; `makeMiniDataset`, `playCareer`, `createReducer`, `makeInitialState` in tests.
- Produces:
  - `APP_VERSION: string` from `src/version.js` (package.json version, injected by Vite as `__APP_VERSION__`).
  - `SAVE_VERSION = 1`, `SAVE_ERRORS = { notFmWeb, newer, damaged }` (exact strings below).
  - `serializeState(state): object` — JSON-safe copy (`draftedIds` Set → array).
  - `makeSaveEnvelope(state, { gameVersion, now }): { app, saveVersion, gameVersion, savedAt, state }`.
  - `toSaveText(envelope): string`.
  - `validateSave(value): { ok: true, save } | { ok: false, reason }` (runs migrations first).
  - `parseSaveText(text): { ok: true, save } | { ok: false, reason }`.
  - `hydrateState(saveState): GameState` — array → `Set`, resets a mid-spin wheel.
  - `describeSave(save): { season, seasonLabel, phaseLabel }` for the resume card and confirm messages.

- [ ] **Step 1: Inject the app version**

`vite.config.js` — add at the top `import { readFileSync } from "node:fs";` and `const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));`, then add to the config object:

```js
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
```

`src/version.js`:

```js
/* global __APP_VERSION__ */
export const APP_VERSION = typeof __APP_VERSION__ === "undefined" ? "dev" : __APP_VERSION__;
```

- [ ] **Step 2: Write the failing tests**

`src/state/save.test.js`:

```js
// @vitest-environment node
import { describe, it, expect } from "vitest";
import { makeMiniDataset } from "../../tests/fixtures/miniDataset.js";
import { playCareer } from "../../tests/fixtures/playCareer.js";
import { createReducer } from "./reducer.js";
import { makeInitialState } from "./initialState.js";
import {
  SAVE_VERSION, SAVE_ERRORS, serializeState, makeSaveEnvelope, toSaveText,
  validateSave, parseSaveText, hydrateState, describeSave,
} from "./save.js";
import { APP_VERSION } from "../version.js";

const NOW = new Date("2026-09-11T20:00:00.000Z");

function midCareerState() {
  const dataset = makeMiniDataset();
  const reducer = createReducer(dataset);
  let state = playCareer({ reducer, initialState: makeInitialState(dataset, 4242), seasons: 2 });
  state = reducer(state, { type: "GOTO_TRANSFER" });
  return reducer(state, { type: "CONTINUE_SEASON" }); // season 3, tactics
}

describe("save format", () => {
  it("round-trips a mid-career state exactly", () => {
    const state = midCareerState();
    const text = toSaveText(makeSaveEnvelope(state, { gameVersion: "1.1.0", now: NOW }));
    const parsed = parseSaveText(text);
    expect(parsed.ok).toBe(true);
    expect(parsed.save).toMatchObject({ app: "fm-web", saveVersion: SAVE_VERSION, gameVersion: "1.1.0", savedAt: "2026-09-11T20:00:00.000Z" });
    const restored = hydrateState(parsed.save.state);
    expect(restored.draftedIds).toBeInstanceOf(Set);
    expect(JSON.stringify(serializeState(restored))).toBe(JSON.stringify(serializeState(state)));
    expect(describeSave(parsed.save)).toEqual({ season: 3, seasonLabel: "2028-29", phaseLabel: "Tactics" });
  });

  it("uses the real app version", () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("rejects saves from other apps, newer versions, and damaged files", () => {
    const good = JSON.parse(toSaveText(makeSaveEnvelope(midCareerState(), { gameVersion: "1.1.0", now: NOW })));
    expect(validateSave({ ...good, app: "other" })).toEqual({ ok: false, reason: SAVE_ERRORS.notFmWeb });
    expect(validateSave(null)).toEqual({ ok: false, reason: SAVE_ERRORS.notFmWeb });
    expect(validateSave({ ...good, saveVersion: SAVE_VERSION + 1 })).toEqual({ ok: false, reason: SAVE_ERRORS.newer });
    expect(parseSaveText("{not json")).toEqual({ ok: false, reason: SAVE_ERRORS.notFmWeb });

    const damaged = (mutate) => {
      const copy = structuredClone(good);
      mutate(copy.state);
      return validateSave(copy);
    };
    expect(damaged((s) => { s.phase = "lobby"; })).toEqual({ ok: false, reason: SAVE_ERRORS.damaged });
    expect(damaged((s) => { s.assignments.pop(); })).toEqual({ ok: false, reason: SAVE_ERRORS.damaged });
    expect(damaged((s) => { s.opponents.pop(); })).toEqual({ ok: false, reason: SAVE_ERRORS.damaged });
    expect(damaged((s) => { s.assignments[0].player.stats.pace = "fast"; })).toEqual({ ok: false, reason: SAVE_ERRORS.damaged });
    expect(damaged((s) => { s.careerSeed = -1; })).toEqual({ ok: false, reason: SAVE_ERRORS.damaged });
    expect(damaged((s) => { delete s.rngCounter; })).toEqual({ ok: false, reason: SAVE_ERRORS.damaged });
  });

  it("resets a wheel that was saved mid-spin", () => {
    const state = { ...midCareerState(), phase: "draft", wheel: { spinning: true, landed: null }, pool: [{ id: "x" }] };
    const restored = hydrateState(serializeState(state));
    expect(restored.wheel).toEqual({ spinning: false, landed: null });
    expect(restored.pool).toEqual([]);
  });
});
```

Run: `npx vitest run src/state/save.test.js`
Expected: FAIL — cannot resolve `./save.js`.

- [ ] **Step 3: Implement**

`src/state/save.js`:

```js
import { FORMATIONS } from "../engine/formations.js";
import { careerSeasonLabel, CAREER_SEASONS } from "../engine/season.js";
import { STAT_KEYS } from "../engine/players.js";

export const SAVE_VERSION = 1;
export const APP_ID = "fm-web";
export const SAVE_ERRORS = {
  notFmWeb: "This isn't an FM.WEB save.",
  newer: "Made with a newer FM.WEB. Refresh to update.",
  damaged: "This save file is damaged.",
};

const PHASE_LABELS = {
  formation: "Formation", draft: "Draft", tactics: "Tactics",
  reveal: "Ratings reveal", result: "Season result", transfer: "Transfer window",
};

// migrations[n] upgrades a version-n save to version n+1. Empty in v1.1.
const migrations = {};

export function serializeState(state) {
  return { ...state, draftedIds: [...state.draftedIds] };
}

export function makeSaveEnvelope(state, { gameVersion, now = new Date() }) {
  return { app: APP_ID, saveVersion: SAVE_VERSION, gameVersion, savedAt: now.toISOString(), state: serializeState(state) };
}

export function toSaveText(envelope) {
  return JSON.stringify(envelope);
}

export function parseSaveText(text) {
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, reason: SAVE_ERRORS.notFmWeb };
  }
  return validateSave(value);
}

export function validateSave(value) {
  if (!isObject(value) || value.app !== APP_ID) return { ok: false, reason: SAVE_ERRORS.notFmWeb };
  if (!Number.isInteger(value.saveVersion) || value.saveVersion < 1) return { ok: false, reason: SAVE_ERRORS.damaged };
  if (value.saveVersion > SAVE_VERSION) return { ok: false, reason: SAVE_ERRORS.newer };
  let save = value;
  while (save.saveVersion < SAVE_VERSION) {
    save = migrations[save.saveVersion](save);
  }
  return isValidState(save.state) ? { ok: true, save } : { ok: false, reason: SAVE_ERRORS.damaged };
}

export function hydrateState(saveState) {
  const state = { ...saveState, draftedIds: new Set(saveState.draftedIds) };
  if (state.wheel.spinning) {
    state.wheel = { spinning: false, landed: null };
    state.pool = [];
  }
  return state;
}

export function describeSave(save) {
  const { season, phase } = save.state;
  return { season, seasonLabel: careerSeasonLabel(season), phaseLabel: PHASE_LABELS[phase] };
}

function isObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isUint32(v) {
  return Number.isInteger(v) && v >= 0 && v <= 0xffffffff;
}

function isPlayer(p) {
  return isObject(p)
    && typeof p.id === "string" && typeof p.name === "string" && typeof p.slot === "string"
    && typeof p.nat === "string" && typeof p.seasonKey === "string" && typeof p.ov === "number"
    && (p.age === null || typeof p.age === "number")
    && isObject(p.stats) && STAT_KEYS.every((k) => typeof p.stats[k] === "number");
}

function isPlayerOrNull(p) {
  return p === null || isPlayer(p);
}

function isValidState(s) {
  if (!isObject(s)) return false;
  if (!Object.hasOwn(PHASE_LABELS, s.phase)) return false;
  const formation = FORMATIONS[s.formationKey];
  if (!formation) return false;
  if (!Array.isArray(s.assignments) || s.assignments.length !== 11) return false;
  if (!s.assignments.every((a, i) => isObject(a) && a.slotId === formation.slots[i].id && isPlayerOrNull(a.player) && isObject(a.pos))) return false;
  if (!Array.isArray(s.bench) || s.bench.length > 6 || !s.bench.every((b) => isObject(b) && isPlayerOrNull(b.player))) return false;
  if (!Array.isArray(s.opponents) || s.opponents.length !== 19 || !s.opponents.every((o) => isObject(o) && typeof o.name === "string")) return false;
  if (!Array.isArray(s.draftedIds) || !s.draftedIds.every((id) => typeof id === "string")) return false;
  if (!Array.isArray(s.draftedIdentities)) return false;
  if (!Array.isArray(s.pool) || !s.pool.every(isPlayer)) return false;
  if (!Array.isArray(s.shortlist) || !s.shortlist.every((e) => isObject(e) && isPlayer(e.player))) return false;
  if (!isObject(s.wheel) || !isObject(s.instructions)) return false;
  if (!isUint32(s.careerSeed) || !Number.isInteger(s.rngCounter) || s.rngCounter < 0) return false;
  if (!Number.isInteger(s.season) || s.season < 1 || s.season > CAREER_SEASONS) return false;
  if (!Number.isInteger(s.eraMin) || !Number.isInteger(s.eraMax)) return false;
  if (s.simulation !== null && !(isObject(s.simulation) && Array.isArray(s.simulation.matches) && Array.isArray(s.simulation.table))) return false;
  return true;
}
```

Note: the mid-spin reset test builds an invalid `pool` entry on purpose (`{ id: "x" }`); `hydrateState` does not validate, so it passes.

- [ ] **Step 4: Verify**

Run: `npx vitest run src/state/save.test.js`
Expected: PASS, 4 tests.

Run: `npm run lint && npm test && npm run build`
Expected: green, 4 lint warnings.

- [ ] **Step 5: Commit**

```bash
git add src/version.js src/state/save.js src/state/save.test.js vite.config.js
git commit -m "Add versioned save format with validation" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 15: Autosave, resume and storage failures

**Files:**
- Create: `src/state/storage.js`, `src/state/storage.test.js`, `src/state/useAutosave.js`, `src/state/useAutosave.test.jsx`, `src/components/app/ResumeCard.jsx`, `src/components/app/StorageBanner.jsx`, `tests/fixtures/saves.js`, `tests/unit/app-saves.test.jsx`
- Modify: `src/state/reducer.js`, `src/App.jsx`

**Interfaces:**
- Consumes: `makeSaveEnvelope`, `serializeState`, `toSaveText`, `validateSave`, `parseSaveText`, `hydrateState`, `describeSave`, `APP_VERSION` (Task 14); `newCareerSeed` (Task 12).
- Produces:
  - `storage.js`: `SAVE_KEY = "fmweb.save"`, `CORRUPT_KEY = "fmweb.save.corrupt"`, `getStorage(win = window): Storage | null`, `readAutosave(storage): { status: "none" } | { status: "ok", save } | { status: "corrupt" }` (moves a bad value to `CORRUPT_KEY`), `writeAutosave(storage, text): boolean`, `clearAutosave(storage)`, `requestPersistentStorage(nav = navigator)`.
  - `useAutosave({ state, storage, enabled, onWriteError, delayMs = 500 })` — no writes in `formation`; immediate write on phase change; otherwise debounced; skips identical state; flushes on `pagehide`.
  - `<ResumeCard summary={{ season, seasonLabel, phaseLabel }} onContinue onNewGame />`, `<StorageBanner kind={"unavailable" | "corrupt"} onDismiss />`.
  - Reducer action `{ type: "LOAD_SAVE", state }`.
  - `FMWeb` accepts an optional `storage` prop (`null` = storage unavailable; omitted = `getStorage()`).
  - `tests/fixtures/saves.js`: `makeSeason3TacticsState(seed?)`, `makeSaveText(state?)`, `fakeStorage(initial?)`.
  - `RatingsRevealScreen` and `ResultCard` accept `instant` (show the finished state without animation).

Behaviour decided here (spec §6.4 made concrete):
- A valid autosave at launch shows the **Continue career** card on the formation screen, and autosave stays **off** until the player continues or confirms a new game, so an untouched launch never overwrites the saved career.
- **Start the draft →** while a saved career exists asks `Start a new career? Your saved career (Season N · YYYY-YY) will be replaced.`
- Retiring / starting a new game from the result screen asks `Start a new career? Your current career will be replaced.` and clears the autosave.
- Persistent storage is requested the first time a draft starts in a session (the spec's "first `NEW_GAME`": a first launch never dispatches `NEW_GAME`).

- [ ] **Step 1: Create the save fixtures**

`tests/fixtures/saves.js`:

```js
import { vi } from "vitest";
import { makeMiniDataset } from "./miniDataset.js";
import { playCareer } from "./playCareer.js";
import { createReducer } from "../../src/state/reducer.js";
import { makeInitialState } from "../../src/state/initialState.js";
import { makeSaveEnvelope, toSaveText } from "../../src/state/save.js";

export function makeSeason3TacticsState(seed = 4242) {
  const dataset = makeMiniDataset();
  const reducer = createReducer(dataset);
  let state = playCareer({ reducer, initialState: makeInitialState(dataset, seed), seasons: 2 });
  state = reducer(state, { type: "GOTO_TRANSFER" });
  return reducer(state, { type: "CONTINUE_SEASON" });
}

export function makeSaveText(state = makeSeason3TacticsState()) {
  return toSaveText(makeSaveEnvelope(state, { gameVersion: "1.1.0", now: new Date("2026-09-11T20:00:00.000Z") }));
}

export function fakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: vi.fn((key, value) => { data.set(key, String(value)); }),
    removeItem: (key) => { data.delete(key); },
  };
}
```

- [ ] **Step 2: Write the failing storage and hook tests**

`src/state/storage.test.js`:

```js
import { describe, it, expect, vi } from "vitest";
import { fakeStorage, makeSaveText } from "../../tests/fixtures/saves.js";
import { SAVE_KEY, CORRUPT_KEY, getStorage, readAutosave, writeAutosave, clearAutosave, requestPersistentStorage } from "./storage.js";

describe("storage", () => {
  it("returns null when localStorage is blocked, and the real storage when it works", () => {
    expect(getStorage({ get localStorage() { throw new Error("SecurityError"); } })).toBeNull();
    expect(getStorage(window)).toBe(window.localStorage);
  });

  it("reads none, a valid save, or moves a corrupt one aside", () => {
    expect(readAutosave(fakeStorage())).toEqual({ status: "none" });

    const ok = readAutosave(fakeStorage({ [SAVE_KEY]: makeSaveText() }));
    expect(ok.status).toBe("ok");
    expect(ok.save.state.season).toBe(3);

    const broken = fakeStorage({ [SAVE_KEY]: "{garbage" });
    expect(readAutosave(broken)).toEqual({ status: "corrupt" });
    expect(broken.data.get(CORRUPT_KEY)).toBe("{garbage");
    expect(broken.data.has(SAVE_KEY)).toBe(false);
  });

  it("reports a failed write instead of throwing, and clears the save", () => {
    const full = fakeStorage();
    full.setItem.mockImplementation(() => { throw new DOMException("full", "QuotaExceededError"); });
    expect(writeAutosave(full, "x")).toBe(false);

    const storage = fakeStorage();
    expect(writeAutosave(storage, "x")).toBe(true);
    clearAutosave(storage);
    expect(storage.data.has(SAVE_KEY)).toBe(false);
  });

  it("asks for persistent storage when the browser supports it", () => {
    const persist = vi.fn(() => Promise.resolve(true));
    requestPersistentStorage({ storage: { persist } });
    expect(persist).toHaveBeenCalledOnce();
    expect(() => requestPersistentStorage({})).not.toThrow();
  });
});
```

`src/state/useAutosave.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { fakeStorage } from "../../tests/fixtures/saves.js";
import { useAutosave } from "./useAutosave.js";
import { SAVE_KEY } from "./storage.js";

const state = (phase, extra = {}) => ({ phase, draftedIds: new Set(), season: 1, ...extra });

function setup(initial, options = {}) {
  const storage = options.storage ?? fakeStorage();
  const onWriteError = vi.fn();
  const hook = renderHook((props) => useAutosave(props), {
    initialProps: { state: initial, storage, enabled: options.enabled ?? true, onWriteError },
  });
  return { storage, onWriteError, rerender: (s, enabled = options.enabled ?? true) => hook.rerender({ state: s, storage, enabled, onWriteError }) };
}

describe("useAutosave", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("never saves on the formation screen", () => {
    const { storage } = setup(state("formation"));
    act(() => vi.advanceTimersByTime(2000));
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("debounces ordinary changes by 500 ms", () => {
    const { storage } = setup(state("draft"));
    act(() => vi.advanceTimersByTime(499));
    expect(storage.setItem).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(storage.setItem).toHaveBeenCalledOnce();
    expect(JSON.parse(storage.data.get(SAVE_KEY)).state.phase).toBe("draft");
  });

  it("saves immediately when the phase changes, and skips identical state", () => {
    const { storage, rerender } = setup(state("draft"));
    act(() => vi.advanceTimersByTime(500));
    rerender(state("tactics"));
    expect(storage.setItem).toHaveBeenCalledTimes(2);
    rerender(state("tactics"));
    act(() => vi.advanceTimersByTime(500));
    expect(storage.setItem).toHaveBeenCalledTimes(2);
  });

  it("does nothing while disabled", () => {
    const { storage } = setup(state("tactics"), { enabled: false });
    act(() => vi.advanceTimersByTime(1000));
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("reports write failures", () => {
    const storage = fakeStorage();
    storage.setItem.mockImplementation(() => { throw new Error("full"); });
    const { onWriteError } = setup(state("draft"), { storage });
    act(() => vi.advanceTimersByTime(500));
    expect(onWriteError).toHaveBeenCalled();
  });

  it("flushes on pagehide", () => {
    const { storage } = setup(state("draft"));
    act(() => { window.dispatchEvent(new Event("pagehide")); });
    expect(storage.setItem).toHaveBeenCalledOnce();
  });
});
```

Run: `npx vitest run src/state/storage.test.js src/state/useAutosave.test.jsx`
Expected: FAIL — cannot resolve `./storage.js` / `./useAutosave.js`.

- [ ] **Step 3: Implement storage and the hook**

`src/state/storage.js`:

```js
import { validateSave } from "./save.js";

export const SAVE_KEY = "fmweb.save";
export const CORRUPT_KEY = "fmweb.save.corrupt";

export function getStorage(win = window) {
  try {
    const storage = win.localStorage;
    const probe = "fmweb.probe";
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

export function readAutosave(storage) {
  const raw = storage.getItem(SAVE_KEY);
  if (raw === null) return { status: "none" };
  let parsed = null;
  try {
    parsed = validateSave(JSON.parse(raw));
  } catch {
    parsed = { ok: false };
  }
  if (parsed.ok) return { status: "ok", save: parsed.save };
  try {
    storage.setItem(CORRUPT_KEY, raw);
    storage.removeItem(SAVE_KEY);
  } catch {
    // Keeping the damaged copy is best effort; the game still starts.
  }
  return { status: "corrupt" };
}

export function writeAutosave(storage, text) {
  try {
    storage.setItem(SAVE_KEY, text);
    return true;
  } catch {
    return false;
  }
}

export function clearAutosave(storage) {
  if (!storage) return;
  try {
    storage.removeItem(SAVE_KEY);
  } catch {
    // Nothing more to do when storage is blocked.
  }
}

export function requestPersistentStorage(nav = navigator) {
  if (nav?.storage?.persist) nav.storage.persist().catch(() => {});
}
```

`src/state/useAutosave.js`:

```js
import { useCallback, useEffect, useRef } from "react";
import { makeSaveEnvelope, serializeState, toSaveText } from "./save.js";
import { writeAutosave } from "./storage.js";
import { APP_VERSION } from "../version.js";

export function useAutosave({ state, storage, enabled, onWriteError, delayMs = 500 }) {
  const lastWritten = useRef(null);
  const lastPhase = useRef(state.phase);
  const latest = useRef(state);
  const onErrorRef = useRef(onWriteError);

  useEffect(() => {
    latest.current = state;
    onErrorRef.current = onWriteError;
  });

  const persist = useCallback((current) => {
    const stateText = JSON.stringify(serializeState(current));
    if (stateText === lastWritten.current) return;
    const ok = writeAutosave(storage, toSaveText(makeSaveEnvelope(current, { gameVersion: APP_VERSION })));
    if (ok) lastWritten.current = stateText;
    else onErrorRef.current?.();
  }, [storage]);

  useEffect(() => {
    const phaseChanged = lastPhase.current !== state.phase;
    lastPhase.current = state.phase;
    if (!enabled || !storage || state.phase === "formation") return undefined;
    if (phaseChanged) {
      persist(state);
      return undefined;
    }
    const timer = setTimeout(() => persist(latest.current), delayMs);
    return () => clearTimeout(timer);
  }, [state, storage, enabled, delayMs, persist]);

  useEffect(() => {
    if (!enabled || !storage) return undefined;
    const flush = () => {
      if (latest.current.phase !== "formation") persist(latest.current);
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [enabled, storage, persist]);
}
```

Run: `npx vitest run src/state/storage.test.js src/state/useAutosave.test.jsx`
Expected: PASS (4 + 6 tests).

- [ ] **Step 4: Write the failing App integration test**

`tests/unit/app-saves.test.jsx`:

```jsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FMWeb from "../../src/App.jsx";
import { makeMiniDataset } from "../fixtures/miniDataset.js";
import { fakeStorage, makeSaveText } from "../fixtures/saves.js";
import { SAVE_KEY, CORRUPT_KEY } from "../../src/state/storage.js";

afterEach(() => vi.restoreAllMocks());

describe("App saves", () => {
  it("offers to continue a saved career and resumes it", async () => {
    const storage = fakeStorage({ [SAVE_KEY]: makeSaveText() });
    render(<FMWeb dataset={makeMiniDataset()} storage={storage} />);
    expect(screen.getByText("Season 3 · 2028-29 · Tactics")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Continue career" }));
    expect(await screen.findByRole("button", { name: /Reveal Ratings & Simulate/ })).toBeTruthy();
  });

  it("asks before a new draft replaces the saved career", () => {
    const text = makeSaveText();
    const storage = fakeStorage({ [SAVE_KEY]: text });
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<FMWeb dataset={makeMiniDataset()} storage={storage} />);

    fireEvent.click(screen.getByRole("button", { name: /Start the draft/ }));
    expect(confirm).toHaveBeenCalledWith("Start a new career? Your saved career (Season 3 · 2028-29) will be replaced.");
    expect(storage.data.get(SAVE_KEY)).toBe(text);

    fireEvent.click(screen.getByRole("button", { name: /Start the draft/ }));
    expect(screen.getByText(/Now drafting/)).toBeTruthy();
    expect(JSON.parse(storage.data.get(SAVE_KEY)).state.phase).toBe("draft");
  });

  it("starts fresh with a notice when the autosave is corrupt", () => {
    const storage = fakeStorage({ [SAVE_KEY]: "{broken" });
    render(<FMWeb dataset={makeMiniDataset()} storage={storage} />);
    expect(screen.getByText(/Your saved career couldn't be loaded/)).toBeTruthy();
    expect(storage.data.get(CORRUPT_KEY)).toBe("{broken");
  });

  it("warns when saving is unavailable", () => {
    render(<FMWeb dataset={makeMiniDataset()} storage={null} />);
    expect(screen.getByText(/Saving isn't available in this browser/)).toBeTruthy();
  });
});
```

Run: `npx vitest run tests/unit/app-saves.test.jsx`
Expected: FAIL — no "Continue career" button / no notices.

- [ ] **Step 5: Implement the UI and wire `App.jsx`**

`src/components/app/ResumeCard.jsx`:

```jsx
export default function ResumeCard({ summary, onContinue, onNewGame }) {
  return (
    <section aria-label="Saved career" className="fmweb-panel rounded-md p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-xs uppercase font-bold text-amber-400" style={{ letterSpacing: "0.2em" }}>Saved career</div>
        <div className="font-black text-neutral-100">Season {summary.season} · {summary.seasonLabel} · {summary.phaseLabel}</div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onNewGame}
          className="px-4 py-2 rounded-md text-xs font-bold border border-neutral-700 text-neutral-200 hover:border-emerald-500 transition">
          New game
        </button>
        <button type="button" onClick={onContinue}
          className="px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wide text-white transition fmweb-cta" style={{ background: "#059669" }}>
          Continue career
        </button>
      </div>
    </section>
  );
}
```

`src/components/app/StorageBanner.jsx`:

```jsx
const MESSAGES = {
  unavailable: "Saving isn't available in this browser. Use Export to keep your career.",
  corrupt: "Your saved career couldn't be loaded, so a new game has started. The damaged save was kept aside.",
};

export default function StorageBanner({ kind, onDismiss }) {
  return (
    <div role="status" className="mb-4 flex items-start justify-between gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
      <p>{MESSAGES[kind]}</p>
      <button type="button" onClick={onDismiss} aria-label="Dismiss" className="shrink-0 font-bold text-amber-300 hover:text-amber-100">✕</button>
    </div>
  );
}
```

`src/state/reducer.js` — add before `default:`:

```js
      case "LOAD_SAVE": {
        return action.state;
      }
```

`src/App.jsx`:

1. Add imports:

```js
import { getStorage, readAutosave, clearAutosave, requestPersistentStorage } from "./state/storage.js";
import { useAutosave } from "./state/useAutosave.js";
import { hydrateState, describeSave } from "./state/save.js";
import ResumeCard from "./components/app/ResumeCard.jsx";
import StorageBanner from "./components/app/StorageBanner.jsx";
```

2. Change the signature to `export default function FMWeb({ dataset, storage: storageProp })` and replace the start of the body (up to and including the `useReducer` line) with:

```jsx
  const [storage] = useState(() => (storageProp !== undefined ? storageProp : getStorage()));
  const [boot] = useState(() => (storage ? readAutosave(storage) : { status: "none" }));
  const reducer = useMemo(() => createReducer(dataset), [dataset]);
  const [state, dispatch] = useReducer(reducer, dataset, (ds) => makeInitialState(ds, newCareerSeed()));
  const [pendingSave, setPendingSave] = useState(boot.status === "ok" ? boot.save : null);
  const [notice, setNotice] = useState(boot.status === "corrupt" ? "corrupt" : storage ? null : "unavailable");
  const [resumed, setResumed] = useState(false);
  const shownPhase = useRef(state.phase);
  const persistRequested = useRef(false);

  useAutosave({ state, storage, enabled: !pendingSave, onWriteError: () => setNotice("unavailable") });

  useEffect(() => {
    if (shownPhase.current !== state.phase) {
      shownPhase.current = state.phase;
      setResumed(false);
    }
  }, [state.phase]);

  const loadCareer = (loaded) => {
    shownPhase.current = loaded.phase;
    setPendingSave(null);
    setResumed(true);
    dispatch({ type: "LOAD_SAVE", state: loaded });
  };

  const confirmReplaceSave = () => {
    if (!pendingSave) return true;
    const { season, seasonLabel } = describeSave(pendingSave);
    if (!window.confirm(`Start a new career? Your saved career (Season ${season} · ${seasonLabel}) will be replaced.`)) return false;
    clearAutosave(storage);
    setPendingSave(null);
    return true;
  };

  const startDraft = () => {
    if (!confirmReplaceSave()) return;
    if (!persistRequested.current) {
      persistRequested.current = true;
      requestPersistentStorage();
    }
    dispatch({ type: "START_DRAFT" });
  };

  const newGame = () => {
    if (!window.confirm("Start a new career? Your current career will be replaced.")) return;
    clearAutosave(storage);
    setResumed(false);
    dispatch({ type: "NEW_GAME", seed: newCareerSeed() });
  };
```

   (`const { phase, formationKey, … } = state;` and everything after it stay as they are.)

3. Directly inside `<div className="max-w-5xl mx-auto px-4 py-6">`, after `</header>`, add:

```jsx
        {notice && <StorageBanner kind={notice} onDismiss={() => setNotice(null)} />}
        {phase === "formation" && pendingSave && (
          <ResumeCard summary={describeSave(pendingSave)} onContinue={() => loadCareer(hydrateState(pendingSave.state))} onNewGame={confirmReplaceSave} />
        )}
```

4. `FormationSelect` `onStart={() => dispatch({ type: "START_DRAFT" })}` → `onStart={startDraft}`.
5. `ResultCard` `onReset={…}` → `onReset={newGame}`, and add `instant={resumed}`.
6. `RatingsRevealScreen` — add `instant={resumed}` in `FMWeb`; in the component signature add `instant`, and change `const [revealed, setRevealed] = useState(0);` to `useState(instant ? starters.length : 0)`.
7. `ResultCard` — add `instant` to its props; change `const [revealed, setRevealed] = useState(0);` to `useState(instant ? total : 0)`, and make the first lines of its `useEffect` body:

```jsx
    if (instant) {
      setRevealed(total);
      return undefined;
    }
```

- [ ] **Step 6: Verify**

Run: `npx vitest run tests/unit/app-saves.test.jsx`
Expected: PASS, 4 tests.

Run: `npm run lint && npm test && npm run build && npm run e2e`
Expected: all green; still 4 lint warnings.

- [ ] **Step 7: Commit**

```bash
git add src/state src/components/app src/App.jsx tests/fixtures/saves.js tests/unit/app-saves.test.jsx
git commit -m "Autosave careers and offer to resume them" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 16: Export and import saves

**Files:**
- Create: `src/state/exportImport.js`, `src/state/exportImport.test.js`, `src/components/app/SaveMenu.jsx`, `src/components/app/SaveMenu.test.jsx`, `tests/e2e/saves.spec.js`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `parseSaveText`, `makeSaveEnvelope`, `toSaveText`, `hydrateState`, `describeSave`, `writeAutosave`, `careerSeasonLabel`, `APP_VERSION`; `loadCareer` in `App.jsx` (Task 15).
- Produces:
  - `saveFileName(state): string` → `fmweb-season{N}-{YYYY-YY}.json`.
  - `exportSaveText(text, fileName, { nav = navigator, win = window, doc = document } = {}): Promise<"shared" | "cancelled" | "downloaded">` — share sheet only on coarse-pointer devices that can share files; otherwise downloads.
  - `readImportFile(file): Promise<{ ok: true, save } | { ok: false, reason }>`.
  - `<SaveMenu canExport onExport onImportFile={(file) => Promise<{ ok, reason?, message? }>} version />` — header button **Menu**, items **Export save** / **Import save**, version line, hidden input `data-testid="import-save-input"`.

- [ ] **Step 1: Write the failing tests**

`src/state/exportImport.test.js`:

```js
import { describe, it, expect, vi, afterEach } from "vitest";
import { makeSaveText, makeSeason3TacticsState } from "../../tests/fixtures/saves.js";
import { saveFileName, exportSaveText, readImportFile } from "./exportImport.js";
import { SAVE_ERRORS } from "./save.js";

afterEach(() => vi.restoreAllMocks());

const coarse = (matches) => ({ matchMedia: () => ({ matches }) });

describe("export and import", () => {
  it("names the file after the season", () => {
    expect(saveFileName(makeSeason3TacticsState())).toBe("fmweb-season3-2028-29.json");
  });

  it("uses the share sheet on touch devices that can share files", async () => {
    const nav = { canShare: vi.fn(() => true), share: vi.fn(() => Promise.resolve()) };
    await expect(exportSaveText("{}", "a.json", { nav, win: coarse(true) })).resolves.toBe("shared");
    expect(nav.share.mock.calls[0][0].files[0].name).toBe("a.json");
  });

  it("treats a dismissed share sheet as cancelled", async () => {
    const nav = { canShare: () => true, share: () => Promise.reject(new DOMException("no", "AbortError")) };
    await expect(exportSaveText("{}", "a.json", { nav, win: coarse(true) })).resolves.toBe("cancelled");
  });

  it("downloads on desktop", async () => {
    URL.createObjectURL = vi.fn(() => "blob:fmweb");
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const nav = { canShare: () => true, share: vi.fn() };
    await expect(exportSaveText("{}", "b.json", { nav, win: coarse(false) })).resolves.toBe("downloaded");
    expect(nav.share).not.toHaveBeenCalled();
    expect(click).toHaveBeenCalledOnce();
  });

  it("reads and validates an imported file", async () => {
    const good = await readImportFile(new File([makeSaveText()], "save.json", { type: "application/json" }));
    expect(good.ok).toBe(true);
    const bad = await readImportFile(new File(["hello"], "notes.txt"));
    expect(bad).toEqual({ ok: false, reason: SAVE_ERRORS.notFmWeb });
  });
});
```

`src/components/app/SaveMenu.test.jsx`:

```jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SaveMenu from "./SaveMenu.jsx";

function openMenu(props = {}) {
  const handlers = { onExport: vi.fn(), onImportFile: vi.fn(() => Promise.resolve({ ok: true, message: "Loaded Season 3 · 2028-29." })), ...props };
  render(<SaveMenu canExport version="1.1.0" {...handlers} />);
  fireEvent.click(screen.getByRole("button", { name: "Menu" }));
  return handlers;
}

describe("SaveMenu", () => {
  it("exports from the menu", () => {
    const { onExport } = openMenu();
    expect(screen.getByText("FM.WEB v1.1.0")).toBeTruthy();
    fireEvent.click(screen.getByRole("menuitem", { name: "Export save" }));
    expect(onExport).toHaveBeenCalledOnce();
  });

  it("disables export when there is no career yet", () => {
    render(<SaveMenu canExport={false} version="1.1.0" onExport={vi.fn()} onImportFile={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByRole("menuitem", { name: "Export save" }).disabled).toBe(true);
  });

  it("shows the reason when an import is rejected", async () => {
    const onImportFile = vi.fn(() => Promise.resolve({ ok: false, reason: "This isn't an FM.WEB save." }));
    openMenu({ onImportFile });
    const file = new File(["x"], "x.json");
    fireEvent.change(screen.getByTestId("import-save-input"), { target: { files: [file] } });
    expect(await screen.findByText("This isn't an FM.WEB save.")).toBeTruthy();
    expect(onImportFile).toHaveBeenCalledWith(file);
  });
});
```

Run: `npx vitest run src/state/exportImport.test.js src/components/app/SaveMenu.test.jsx`
Expected: FAIL — modules not found.

- [ ] **Step 2: Implement**

`src/state/exportImport.js`:

```js
import { careerSeasonLabel } from "../engine/season.js";
import { parseSaveText } from "./save.js";

export function saveFileName(state) {
  return `fmweb-season${state.season}-${careerSeasonLabel(state.season)}.json`;
}

export async function exportSaveText(text, fileName, { nav = navigator, win = window, doc = document } = {}) {
  const file = new File([text], fileName, { type: "application/json" });
  const touch = win.matchMedia?.("(pointer: coarse)").matches;
  if (touch && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: "FM.WEB save" });
      return "shared";
    } catch (error) {
      if (error?.name === "AbortError") return "cancelled";
      // Any other share failure falls through to a normal download.
    }
  }
  const url = URL.createObjectURL(file);
  const link = doc.createElement("a");
  link.href = url;
  link.download = fileName;
  doc.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}

export async function readImportFile(file) {
  return parseSaveText(await file.text());
}
```

`src/components/app/SaveMenu.jsx`:

```jsx
import { useRef, useState } from "react";

const ITEM = "w-full text-left px-2 py-1.5 rounded text-xs font-bold text-neutral-200 hover:bg-neutral-800 disabled:text-neutral-600 disabled:hover:bg-transparent";

export default function SaveMenu({ canExport, onExport, onImportFile, version }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(null);
  const fileInput = useRef(null);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const result = await onImportFile(file);
    if (result.ok) {
      setOpen(false);
      setMessage(result.message ?? null);
    } else if (result.reason) {
      setMessage(result.reason);
    }
  };

  return (
    <div className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className="px-3 py-1.5 rounded border border-neutral-700 text-xs font-bold uppercase tracking-wide text-neutral-300 hover:border-emerald-500">
        Menu
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-2 w-56 z-40 fmweb-panel rounded-md p-2 space-y-1">
          <button type="button" role="menuitem" className={ITEM} disabled={!canExport}
            onClick={() => { setOpen(false); onExport(); }}>
            Export save
          </button>
          <button type="button" role="menuitem" className={ITEM} onClick={() => fileInput.current?.click()}>
            Import save
          </button>
          <p className="px-2 pt-1 text-xs text-neutral-500">FM.WEB v{version}</p>
        </div>
      )}
      <input ref={fileInput} type="file" accept=".json,application/json" className="hidden"
        data-testid="import-save-input" aria-label="Import save file" onChange={handleFile} />
      {message && (
        <p role="status" className="absolute right-0 top-full mt-2 w-64 z-30 fmweb-panel rounded-md p-2 text-xs text-neutral-200"
          onClick={() => setMessage(null)}>
          {message}
        </p>
      )}
    </div>
  );
}
```

`src/App.jsx`:

1. Imports:

```js
import { saveFileName, exportSaveText, readImportFile } from "./state/exportImport.js";
import { makeSaveEnvelope, toSaveText } from "./state/save.js";
import { writeAutosave } from "./state/storage.js";
import { APP_VERSION } from "./version.js";
import SaveMenu from "./components/app/SaveMenu.jsx";
```

   (Merge with the existing `./state/save.js` and `./state/storage.js` import lines rather than duplicating them.)

2. Below `newGame` add:

```jsx
  const exportCareer = () => {
    exportSaveText(toSaveText(makeSaveEnvelope(state, { gameVersion: APP_VERSION })), saveFileName(state));
  };

  const importCareer = async (file) => {
    const result = await readImportFile(file);
    if (!result.ok) return result;
    const hasCareer = state.phase !== "formation" || pendingSave;
    const currentSeason = pendingSave ? pendingSave.state.season : state.season;
    if (hasCareer && !window.confirm(`Replace your current career (Season ${currentSeason})?`)) return { ok: false };
    const loaded = hydrateState(result.save.state);
    if (storage) writeAutosave(storage, toSaveText(makeSaveEnvelope(loaded, { gameVersion: APP_VERSION })));
    loadCareer(loaded);
    const { season, seasonLabel } = describeSave(result.save);
    return { ok: true, message: `Loaded Season ${season} · ${seasonLabel}.` };
  };
```

3. In the header, wrap the existing right-hand `<div className="hidden sm:flex …">…</div>` together with the menu:

```jsx
          <div className="flex items-center gap-3">
            {/* existing hidden sm:flex step indicator div, unchanged */}
            <SaveMenu canExport={phase !== "formation"} onExport={exportCareer} onImportFile={importCareer} version={APP_VERSION} />
          </div>
```

- [ ] **Step 3: Add the browser tests**

`tests/e2e/saves.spec.js`:

```js
import { test, expect } from "@playwright/test";
import { draftFullXI } from "./helpers.js";

test("reloading mid-tactics offers to continue the same career", async ({ page }) => {
  await page.goto("./");
  await draftFullXI(page);
  await expect(page.getByRole("button", { name: /Reveal Ratings & Simulate/ })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Season 1 · 2026-27 · Tactics")).toBeVisible();
  await page.getByRole("button", { name: "Continue career" }).click();
  await expect(page.getByRole("button", { name: /Reveal Ratings & Simulate/ })).toBeVisible();
});

test("an exported save imports into a fresh browser", async ({ page, browser, isMobile }) => {
  test.skip(isMobile, "the file download and upload flow runs on the desktop project");
  await page.goto("./");
  await draftFullXI(page);

  await page.getByRole("button", { name: "Menu" }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("menuitem", { name: "Export save" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("fmweb-season1-2026-27.json");
  const savePath = await download.path();

  const freshContext = await browser.newContext();
  const fresh = await freshContext.newPage();
  await fresh.goto(page.url());
  await fresh.getByRole("button", { name: "Menu" }).click();
  await fresh.getByTestId("import-save-input").setInputFiles(savePath);
  await expect(fresh.getByRole("button", { name: /Reveal Ratings & Simulate/ })).toBeVisible();
  await freshContext.close();
});
```

- [ ] **Step 4: Verify**

Run: `npx vitest run src/state/exportImport.test.js src/components/app/SaveMenu.test.jsx`
Expected: PASS (5 + 3 tests).

Run: `npm run lint && npm test && npm run build && npm run e2e`
Expected: all green — e2e now 3 smoke + 3 reload + 1 export/import (2 skipped on mobile projects); 4 lint warnings.

- [ ] **Step 5: Commit**

```bash
git add src/state/exportImport.js src/state/exportImport.test.js src/components/app/SaveMenu.jsx src/components/app/SaveMenu.test.jsx src/App.jsx tests/e2e/saves.spec.js
git commit -m "Export and import saves from the header menu" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 17: Crash screen (ErrorBoundary)

**Files:**
- Create: `src/components/app/ErrorBoundary.jsx`, `src/components/app/ErrorBoundary.test.jsx`
- Modify: `src/main.jsx`

**Interfaces:**
- Consumes: `SAVE_KEY`, `CORRUPT_KEY`, `getStorage` (Task 15); `exportSaveText` (Task 16); `APP_VERSION` (Task 14).
- Produces: `<ErrorBoundary storage? reload? exportFn?>{children}</ErrorBoundary>` — optional props exist for tests; production uses `getStorage()`, `window.location.reload()` and `exportSaveText`.

- [ ] **Step 1: Write the failing test**

`src/components/app/ErrorBoundary.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ErrorBoundary from "./ErrorBoundary.jsx";
import { fakeStorage, makeSaveText } from "../../../tests/fixtures/saves.js";
import { SAVE_KEY, CORRUPT_KEY } from "../../state/storage.js";
import { APP_VERSION } from "../../version.js";

function Boom() {
  throw new Error("boom");
}

describe("ErrorBoundary", () => {
  beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());

  it("shows the error, version and career seed, and can export the autosave", () => {
    const text = makeSaveText();
    const storage = fakeStorage({ [SAVE_KEY]: text });
    const exportFn = vi.fn(() => Promise.resolve("downloaded"));
    render(<ErrorBoundary storage={storage} reload={vi.fn()} exportFn={exportFn}><Boom /></ErrorBoundary>);

    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeTruthy();
    expect(screen.getByText(/boom/)).toBeTruthy();
    expect(screen.getByText(new RegExp(`Version ${APP_VERSION}`))).toBeTruthy();
    expect(screen.getByText(new RegExp(`Career seed ${JSON.parse(text).state.careerSeed}`))).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Export save" }));
    expect(exportFn).toHaveBeenCalledWith(text, "fmweb-save.json");
  });

  it("Start new game keeps the save aside and reloads", () => {
    const text = makeSaveText();
    const storage = fakeStorage({ [SAVE_KEY]: text });
    const reload = vi.fn();
    render(<ErrorBoundary storage={storage} reload={reload}><Boom /></ErrorBoundary>);
    fireEvent.click(screen.getByRole("button", { name: "Start new game" }));
    expect(storage.data.get(CORRUPT_KEY)).toBe(text);
    expect(storage.data.has(SAVE_KEY)).toBe(false);
    expect(reload).toHaveBeenCalledOnce();
  });

  it("hides Export when there is no save, and Reload reloads", () => {
    const reload = vi.fn();
    render(<ErrorBoundary storage={null} reload={reload}><Boom /></ErrorBoundary>);
    expect(screen.queryByRole("button", { name: "Export save" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Reload" }));
    expect(reload).toHaveBeenCalledOnce();
  });
});
```

Run: `npx vitest run src/components/app/ErrorBoundary.test.jsx`
Expected: FAIL — cannot resolve `./ErrorBoundary.jsx`.

- [ ] **Step 2: Implement**

`src/components/app/ErrorBoundary.jsx`:

```jsx
import { Component } from "react";
import { APP_VERSION } from "../../version.js";
import { SAVE_KEY, CORRUPT_KEY, getStorage } from "../../state/storage.js";
import { exportSaveText } from "../../state/exportImport.js";

const BUTTON = "px-4 py-2.5 rounded-md text-xs font-bold uppercase tracking-wide transition";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("FM.WEB crashed", error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const storage = this.props.storage !== undefined ? this.props.storage : getStorage();
    const reload = this.props.reload ?? (() => window.location.reload());
    const exportFn = this.props.exportFn ?? exportSaveText;
    const rawSave = storage ? storage.getItem(SAVE_KEY) : null;

    let careerSeed = "unknown";
    try {
      careerSeed = String(JSON.parse(rawSave).state.careerSeed ?? "unknown");
    } catch {
      // No readable save; the seed stays unknown.
    }

    const startNewGame = () => {
      if (storage && rawSave !== null) {
        try {
          storage.setItem(CORRUPT_KEY, rawSave);
          storage.removeItem(SAVE_KEY);
        } catch {
          // Storage blocked or full; reloading still gives the player a way out.
        }
      }
      reload();
    };

    return (
      <div role="alert" className="min-h-screen w-full flex items-center justify-center px-6 text-neutral-200"
        style={{ background: "linear-gradient(180deg, #0c1310 0%, #090d0b 55%, #07100c 100%)" }}>
        <div className="fmweb-panel rounded-md p-6 max-w-md w-full space-y-3">
          <h1 className="text-lg font-black text-white">Something went wrong</h1>
          <p className="text-sm text-neutral-400 break-words">{String(error.message || error)}</p>
          <p className="text-xs text-neutral-500 font-mono">Version {APP_VERSION} · Career seed {careerSeed}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            <button type="button" onClick={reload} className={`${BUTTON} text-white`} style={{ background: "#059669" }}>Reload</button>
            {rawSave !== null && (
              <button type="button" onClick={() => exportFn(rawSave, "fmweb-save.json")}
                className={`${BUTTON} border border-neutral-700 text-neutral-200 hover:border-emerald-500`}>
                Export save
              </button>
            )}
            <button type="button" onClick={startNewGame}
              className={`${BUTTON} border border-neutral-700 text-neutral-300 hover:border-rose-400`}>
              Start new game
            </button>
          </div>
        </div>
      </div>
    );
  }
}
```

`src/main.jsx` — wrap everything below `React.StrictMode`:

```jsx
import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import FMWeb from "./App.jsx";
import DatasetGate from "./components/app/DatasetGate.jsx";
import ErrorBoundary from "./components/app/ErrorBoundary.jsx";
import { loadDataset } from "./data/loadDataset.js";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <DatasetGate load={loadDataset}>
        {(dataset) => <FMWeb dataset={dataset} />}
      </DatasetGate>
    </ErrorBoundary>
  </React.StrictMode>
);
```

- [ ] **Step 3: Verify**

Run: `npx vitest run src/components/app/ErrorBoundary.test.jsx`
Expected: PASS, 3 tests.

Run: `npm run lint && npm test && npm run build && npm run e2e`
Expected: all green, 4 lint warnings.

- [ ] **Step 4: Commit**

```bash
git add src/components/app/ErrorBoundary.jsx src/components/app/ErrorBoundary.test.jsx src/main.jsx
git commit -m "Add a crash screen that can rescue the saved career" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 18: Split out the UI building blocks

**Files:**
- Create: `src/components/ui/StatPip.jsx`, `OvBadge.jsx`, `PlayerMiniCard.jsx`, `RadarChart.jsx`, `Slider.jsx`, `src/components/ui/ui.test.jsx`
- Modify: `src/App.jsx`, `eslint.config.js`

**Interfaces:**
- Consumes: `clamp` (util).
- Produces (default exports, props unchanged from v1): `StatPip({ label, value })`, `OvBadge({ ov, size })`, `PlayerMiniCard({ player, onClick, selected, dim, hideRating })`, `RadarChart({ data })`, `Slider({ label, value, onChange, leftLabel, rightLabel, tooltip })`.

Tasks 18–21 change **no markup, classes or behaviour** — code moves only.

- [ ] **Step 1: Catch undefined JSX components in lint**

In `eslint.config.js`, add to the main rules block: `"react/jsx-no-undef": "error",`.

Run: `npm run lint`
Expected: 0 errors, 4 warnings.

- [ ] **Step 2: Write the failing test**

`src/components/ui/ui.test.jsx`:

```jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StatPip from "./StatPip.jsx";
import OvBadge from "./OvBadge.jsx";
import PlayerMiniCard from "./PlayerMiniCard.jsx";
import RadarChart from "./RadarChart.jsx";
import Slider from "./Slider.jsx";

const player = { id: "p", name: "Tony Adams", slot: "CB", side: null, nat: "England", age: 26, ov: 91 };

describe("ui building blocks", () => {
  it("StatPip shows its label and value", () => {
    render(<StatPip label="Pace" value={88} />);
    expect(screen.getByText("Pace")).toBeTruthy();
    expect(screen.getByText("88")).toBeTruthy();
  });

  it("OvBadge shows the rating", () => {
    render(<OvBadge ov={91} />);
    expect(screen.getByText("91")).toBeTruthy();
  });

  it("PlayerMiniCard can hide the rating", () => {
    const onClick = vi.fn();
    render(<PlayerMiniCard player={player} onClick={onClick} hideRating />);
    expect(screen.getByText("?")).toBeTruthy();
    expect(screen.queryByText("91")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Tony Adams/ }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("RadarChart labels all six axes", () => {
    const labels = ["Attack", "Creativity", "Buildup", "Press", "Defense", "Physical"];
    render(<RadarChart data={labels.map((label, i) => ({ label, value: 50 + i }))} />);
    for (const label of labels) expect(screen.getByText(label)).toBeTruthy();
  });

  it("Slider reports numbers", () => {
    const onChange = vi.fn();
    render(<Slider label="Tempo" value={50} onChange={onChange} leftLabel="Slow" rightLabel="Fast" />);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "70" } });
    expect(onChange).toHaveBeenCalledWith(70);
  });
});
```

Run: `npx vitest run src/components/ui`
Expected: FAIL — modules not found.

- [ ] **Step 3: Move the components**

Cut each function (with its comment) out of `src/App.jsx` into its own file as `export default function …`, with exactly these imports:

| File | Imports |
|---|---|
| `StatPip.jsx` | `import { clamp } from "../../engine/util.js";` |
| `OvBadge.jsx` | none |
| `PlayerMiniCard.jsx` | `import OvBadge from "./OvBadge.jsx";` |
| `RadarChart.jsx` | `import { clamp } from "../../engine/util.js";` |
| `Slider.jsx` | none |

Add to `src/App.jsx`:

```js
import StatPip from "./components/ui/StatPip.jsx";
import OvBadge from "./components/ui/OvBadge.jsx";
import PlayerMiniCard from "./components/ui/PlayerMiniCard.jsx";
import RadarChart from "./components/ui/RadarChart.jsx";
import Slider from "./components/ui/Slider.jsx";
```

Remove any `App.jsx` import that lint now reports as unused (e.g. `clamp` is still used by `EraRangeSlider`, so it stays until Task 20).

- [ ] **Step 4: Verify**

Run: `npx vitest run src/components/ui`
Expected: PASS, 5 tests.

Run: `npm run lint && npm test && npm run build && npm run e2e`
Expected: all green; 0 errors and exactly the 4 known warnings.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui src/App.jsx eslint.config.js
git commit -m "Split UI building blocks out of App.jsx" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 19: Split out the pitch, bench and drag handling

**Files:**
- Create: `src/components/pitch/PitchMarkings.jsx`, `Pitch.jsx`, `BenchStrip.jsx`, `usePitchDrag.js`, `usePitchDrag.test.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `dispatch` and `assignments` from `FMWeb`.
- Produces:
  - Default exports `PitchMarkings()`, `Pitch({ assignments, onSlotClick, activeSlotId, mode, onDragStart, draggingId, dragHint })`, `BenchStrip({ bench, onDragStart, draggingId, draggable })`.
  - `usePitchDrag({ assignments, dispatch }): { dragInfo: { kind: "slot" | "bench", id } | null, startDrag(kind, id) }` — v1's global pointer-up coordinator, moved unchanged (bug #7 is fixed in Task 26).

- [ ] **Step 1: Write the failing test (current drop behaviour)**

`src/components/pitch/usePitchDrag.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePitchDrag } from "./usePitchDrag.js";

const assignments = [
  { slotId: "GK", pos: { x: 50, y: 92 } },
  { slotId: "ST", pos: { x: 50, y: 12 } },
];

function setupDom() {
  document.body.innerHTML = `
    <div data-drop-zone="pitch" id="pitch"><button data-slot-id="GK" id="gk"></button><button data-slot-id="ST" id="st"></button></div>
    <div data-bench-idx="2" id="bench2"></div>
    <div id="outside"></div>`;
  document.getElementById("pitch").getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 300 });
}

function pointAt(id) {
  document.elementFromPoint = vi.fn(() => document.getElementById(id));
}

function release(x = 100, y = 150) {
  window.dispatchEvent(new PointerEvent("pointerup", { clientX: x, clientY: y }));
}

describe("usePitchDrag", () => {
  beforeEach(setupDom);

  function start(kind, id) {
    const dispatch = vi.fn();
    const hook = renderHook(() => usePitchDrag({ assignments, dispatch }));
    act(() => hook.result.current.startDrag(kind, id));
    return { dispatch, hook };
  }

  it("swaps two slots when a player is dropped on a teammate", () => {
    const { dispatch, hook } = start("slot", "GK");
    pointAt("st");
    act(() => release());
    expect(dispatch).toHaveBeenCalledWith({ type: "SWAP_PLAYERS", fromKind: "slot", fromId: "GK", toKind: "slot", toId: "ST" });
    expect(hook.result.current.dragInfo).toBeNull();
  });

  it("ignores a drop back on the same slot", () => {
    const { dispatch } = start("slot", "GK");
    pointAt("gk");
    act(() => release());
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("swaps with a bench spot", () => {
    const { dispatch } = start("slot", "ST");
    pointAt("bench2");
    act(() => release());
    expect(dispatch).toHaveBeenCalledWith({ type: "SWAP_PLAYERS", fromKind: "slot", fromId: "ST", toKind: "bench", toId: 2 });
  });

  it("moves a slot player to the exact drop point on open pitch", () => {
    const { dispatch } = start("slot", "GK");
    pointAt("pitch");
    act(() => release(100, 150));
    expect(dispatch).toHaveBeenCalledWith({ type: "MOVE_PLAYER", slotId: "GK", x: 50, y: 50 });
  });

  it("swaps a bench player into the nearest slot when dropped on open pitch", () => {
    const { dispatch } = start("bench", 1);
    pointAt("pitch");
    act(() => release(100, 30)); // (50, 10) → nearest is ST at (50, 12)
    expect(dispatch).toHaveBeenCalledWith({ type: "SWAP_PLAYERS", fromKind: "bench", fromId: 1, toKind: "slot", toId: "ST" });
  });
});
```

Run: `npx vitest run src/components/pitch`
Expected: FAIL — cannot resolve `./usePitchDrag.js`.

- [ ] **Step 2: Move the code**

- `PitchMarkings.jsx` ← `PitchMarkings` (no imports).
- `Pitch.jsx` ← `Pitch`, with `import PitchMarkings from "./PitchMarkings.jsx";`.
- `BenchStrip.jsx` ← `BenchStrip` (no imports).
- `usePitchDrag.js` — cut `const [dragInfo, setDragInfo] = useState(null);` and the whole pointer-up `useEffect` (with its comment) out of `FMWeb`:

```js
import { useEffect, useState } from "react";

export function usePitchDrag({ assignments, dispatch }) {
  const [dragInfo, setDragInfo] = useState(null); // { kind: 'slot'|'bench', id }

  // ← the v1 comment block and useEffect body from FMWeb, unchanged,
  //   with the dependency array changed from [dragInfo, assignments] to [dragInfo, assignments, dispatch]

  return { dragInfo, startDrag: (kind, id) => setDragInfo({ kind, id }) };
}
```

  Paste the effect where the comment is; the result contains no placeholder comment.

In `FMWeb`: right after `const { phase, formationKey, assignments, … } = state;` add `const { dragInfo, startDrag } = usePitchDrag({ assignments, dispatch });`; replace both `onDragStart={(kind, id) => setDragInfo({ kind, id })}` with `onDragStart={startDrag}`. Add imports:

```js
import Pitch from "./components/pitch/Pitch.jsx";
import BenchStrip from "./components/pitch/BenchStrip.jsx";
import { usePitchDrag } from "./components/pitch/usePitchDrag.js";
```

- [ ] **Step 3: Verify**

Run: `npx vitest run src/components/pitch`
Expected: PASS, 5 tests.

Run: `npm run lint && npm test && npm run build && npm run e2e`
Expected: all green, 4 warnings.

- [ ] **Step 4: Commit**

```bash
git add src/components/pitch src/App.jsx
git commit -m "Split pitch, bench and drag handling out of App.jsx" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 20: Split out the screens

**Files:**
- Create in `src/components/screens/`: `WheelSpinner.jsx`, `DraftScreen.jsx`, `EraRangeSlider.jsx`, `FormationSelect.jsx`, `RoleEditor.jsx`, `StyleSelector.jsx`, `InstructionsPanel.jsx`, `TacticsSummary.jsx`, `ResultCard.jsx`, `TransferCandidate.jsx`, `TransferScreen.jsx`, `RatingsRevealScreen.jsx`, `screens.test.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: engine constants/helpers, `ui/*`, `pitch/*`.
- Produces: one default-exported component per file, props exactly as they are in `App.jsx` after Task 15 (`DraftScreen` takes `eraIndex`; `ResultCard` and `RatingsRevealScreen` take `instant`).

- [ ] **Step 1: Write the failing smoke tests**

`src/components/screens/screens.test.jsx`:

```jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { makeMiniDataset } from "../../../tests/fixtures/miniDataset.js";
import { playCareer } from "../../../tests/fixtures/playCareer.js";
import { createReducer } from "../../state/reducer.js";
import { makeInitialState } from "../../state/initialState.js";
import FormationSelect from "./FormationSelect.jsx";
import RatingsRevealScreen from "./RatingsRevealScreen.jsx";
import ResultCard from "./ResultCard.jsx";
import TransferScreen from "./TransferScreen.jsx";

function seasonOneResult() {
  const dataset = makeMiniDataset();
  const reducer = createReducer(dataset);
  const state = playCareer({ reducer, initialState: makeInitialState(dataset, 11), seasons: 1 });
  return { reducer, state };
}

describe("screens render", () => {
  it("FormationSelect", () => {
    const dataset = makeMiniDataset();
    const state = makeInitialState(dataset, 1);
    render(<FormationSelect formationKey="4-3-3" onPick={vi.fn()} onStart={vi.fn()} assignments={state.assignments} eraMin={1992} eraMax={2024} onSetEra={vi.fn()} />);
    expect(screen.getByText("Choose your formation")).toBeTruthy();
  });

  it("RatingsRevealScreen shows everything at once when instant", () => {
    const { state } = seasonOneResult();
    render(<RatingsRevealScreen assignments={state.assignments} season={1} onKickoff={vi.fn()} instant />);
    expect(screen.getByText("Squad Average")).toBeTruthy();
  });

  it("ResultCard shows the verdict and table when instant", () => {
    const { state } = seasonOneResult();
    render(<ResultCard simulation={state.simulation} formationKey={state.formationKey} assignments={state.assignments} onReset={vi.fn()} onContinue={vi.fn()} instant />);
    expect(screen.getByText(state.simulation.tier.name)).toBeTruthy();
    expect(screen.getByText(/Final Table/)).toBeTruthy();
  });

  it("TransferScreen lists five candidates", () => {
    const { reducer, state } = seasonOneResult();
    const transfer = reducer(state, { type: "GOTO_TRANSFER" });
    render(<TransferScreen shortlist={transfer.shortlist} assignments={transfer.assignments} season={1} lastTransition={transfer.lastTransition} onSignBench={vi.fn()} onSignXI={vi.fn()} onContinue={vi.fn()} />);
    expect(screen.getAllByRole("button", { name: "Sign to Bench" })).toHaveLength(5);
  });
});
```

Run: `npx vitest run src/components/screens`
Expected: FAIL — modules not found.

- [ ] **Step 2: Move the components**

Cut each function out of `src/App.jsx` into `src/components/screens/<Name>.jsx` as `export default function`, with these imports:

| File | Imports |
|---|---|
| `WheelSpinner.jsx` | `import { useEffect, useRef, useState } from "react";` (its `eslint-disable-next-line no-restricted-properties` line moves with it) |
| `EraRangeSlider.jsx` | `import { useEffect, useRef, useState } from "react";` `import { clamp, seasonLabel } from "../../engine/util.js";` |
| `FormationSelect.jsx` | `import { FORMATIONS } from "../../engine/formations.js";` `import { seasonLabel } from "../../engine/util.js";` `import Pitch from "../pitch/Pitch.jsx";` `import EraRangeSlider from "./EraRangeSlider.jsx";` |
| `DraftScreen.jsx` | `import { SLOT_TYPE_LABEL } from "../../engine/formations.js";` `import { seasonLabel } from "../../engine/util.js";` `import Pitch from "../pitch/Pitch.jsx";` `import PlayerMiniCard from "../ui/PlayerMiniCard.jsx";` `import WheelSpinner from "./WheelSpinner.jsx";` |
| `RoleEditor.jsx` | `import { SLOT_TYPE_LABEL } from "../../engine/formations.js";` `import { ROLES, DUTY_INFO } from "../../engine/roles.js";` `import { STAT_KEYS, STAT_LABELS } from "../../engine/players.js";` `import { playerContribution } from "../../engine/tactics.js";` `import StatPip from "../ui/StatPip.jsx";` `import Slider from "../ui/Slider.jsx";` |
| `StyleSelector.jsx` | `import { STYLE_PRESETS } from "../../engine/instructions.js";` |
| `InstructionsPanel.jsx` | `import { mentalityLabel } from "../../engine/readout.js";` `import Slider from "../ui/Slider.jsx";` |
| `TacticsSummary.jsx` | `import { familiarityLabel } from "../../engine/familiarity.js";` `import { tacticalReadout } from "../../engine/readout.js";` `import RadarChart from "../ui/RadarChart.jsx";` |
| `ResultCard.jsx` | `import { useEffect, useRef, useState } from "react";` `import { FORMATIONS } from "../../engine/formations.js";` `import { CAREER_SEASONS, careerSeasonLabel } from "../../engine/season.js";` `import TacticsSummary from "./TacticsSummary.jsx";` |
| `TransferCandidate.jsx` | `import { useState } from "react";` `import { STAT_KEYS, STAT_LABELS } from "../../engine/players.js";` `import StatPip from "../ui/StatPip.jsx";` |
| `TransferScreen.jsx` | `import { careerSeasonLabel } from "../../engine/season.js";` `import TransferCandidate from "./TransferCandidate.jsx";` |
| `RatingsRevealScreen.jsx` | `import { useEffect, useMemo, useState } from "react";` `import { careerSeasonLabel } from "../../engine/season.js";` `import OvBadge from "../ui/OvBadge.jsx";` |

Import them in `src/App.jsx` and remove the `App.jsx` imports that lint now flags as unused (engine constants now only used inside the screens, `StatPip`, `OvBadge`, `PlayerMiniCard`, `RadarChart`, `Slider`, `clamp`, `seasonLabel`, etc.). `react/jsx-no-undef` reports any component you forgot to import.

- [ ] **Step 3: Verify**

Run: `npx vitest run src/components/screens`
Expected: PASS, 4 tests.

Run: `npm run lint && npm test && npm run build && npm run e2e`
Expected: 0 errors and the 4 known warnings, now in `src/engine/tactics.js` (`foc`), `src/components/screens/RoleEditor.jsx` (`neutralRole`), `src/components/screens/DraftScreen.jsx` (`formationKey`) and `src/App.jsx` (`draftedIds`); everything else green.

- [ ] **Step 4: Commit**

```bash
git add src/components/screens src/App.jsx
git commit -m "Split screens out of App.jsx" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 21: Tactics screen, stylesheet, and `App.jsx` as a shell

**Files:**
- Create: `src/components/screens/TacticsScreen.jsx`, `src/components/screens/TacticsScreen.test.jsx`
- Modify: `src/App.jsx`, `src/index.css`

**Interfaces:**
- Consumes: `Pitch`, `BenchStrip`, `StyleSelector`, `RoleEditor`, `InstructionsPanel`, `TacticsSummary`.
- Produces: `TacticsScreen({ state, dispatch, activeSlotId, onSelectSlot, dragInfo, onDragStart, profile, familiarity })` — the v1 `phase === "tactics"` block. `App.jsx` holds only `FMWeb` (header, notices, menu, screen switch).

- [ ] **Step 1: Write the failing test**

`src/components/screens/TacticsScreen.test.jsx`:

```jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { makeSeason3TacticsState } from "../../../tests/fixtures/saves.js";
import { liveAssignments, selectFamiliarity, selectProfile } from "../../state/selectors.js";
import TacticsScreen from "./TacticsScreen.jsx";

describe("TacticsScreen", () => {
  it("renders the board and dispatches Simulate", () => {
    const state = makeSeason3TacticsState();
    const live = liveAssignments(state.assignments);
    const familiarity = selectFamiliarity(live, state.instructions, state.formationKey);
    const profile = selectProfile(live, state.instructions, familiarity);
    const dispatch = vi.fn();
    render(<TacticsScreen state={state} dispatch={dispatch} activeSlotId={null} onSelectSlot={vi.fn()}
      dragInfo={null} onDragStart={vi.fn()} profile={profile} familiarity={familiarity} />);
    expect(screen.getByText("1. Style of Play")).toBeTruthy();
    expect(screen.getByText("2. Team Instructions")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Reveal Ratings & Simulate/ }));
    expect(dispatch).toHaveBeenCalledWith({ type: "SIMULATE" });
  });
});
```

Run: `npx vitest run src/components/screens/TacticsScreen.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 2: Extract the tactics block**

`src/components/screens/TacticsScreen.jsx`:

```jsx
import Pitch from "../pitch/Pitch.jsx";
import BenchStrip from "../pitch/BenchStrip.jsx";
import StyleSelector from "./StyleSelector.jsx";
import RoleEditor from "./RoleEditor.jsx";
import InstructionsPanel from "./InstructionsPanel.jsx";
import TacticsSummary from "./TacticsSummary.jsx";

export default function TacticsScreen({ state, dispatch, activeSlotId, onSelectSlot, dragInfo, onDragStart, profile, familiarity }) {
  const { assignments, bench, instructions } = state;
  const activeAssignment = assignments.find((a) => a.slotId === activeSlotId);
  // ← the JSX inside `{phase === "tactics" && ( … )}` from FMWeb, returned as-is, with:
  //   onSlotClick={(id) => setActiveSlotId(id === activeSlotId ? null : id)} → onSlotClick={onSelectSlot}
  //   both onDragStart={startDrag}                                           → onDragStart={onDragStart}
  //   state.selectedStyle stays state.selectedStyle
}
```

After pasting, the function body is `const …; const …; return ( <div style={{ display: "flex", … }}> … </div> );` with no placeholder comment. In `FMWeb`, delete `activeAssignment` and replace the tactics block with:

```jsx
        {phase === "tactics" && (
          <TacticsScreen state={state} dispatch={dispatch} activeSlotId={activeSlotId}
            onSelectSlot={(id) => setActiveSlotId(id === activeSlotId ? null : id)}
            dragInfo={dragInfo} onDragStart={startDrag} profile={profile} familiarity={familiarity} />
        )}
```

- [ ] **Step 3: Move the stylesheet**

Cut the CSS text inside `<style>{` … `}</style>` in `FMWeb` (from `.fmweb-root, .fmweb-root *` to the end of `.fmweb-panel { … }`) and append it to `src/index.css` below the `@tailwind` lines. Delete the `<style>` element and the fragment wrapper if it becomes redundant.

Run: `grep -n "<style" src/App.jsx; grep -c "fmweb-panel" src/index.css`
Expected: no `<style` in `App.jsx`; `index.css` count ≥ 1.

- [ ] **Step 4: Verify, including a visual check**

Run: `npx vitest run src/components/screens/TacticsScreen.test.jsx`
Expected: PASS.

Run: `npm run lint && npm test && npm run build && npm run e2e`
Expected: all green, 4 warnings. `wc -l src/App.jsx` is under 320 lines.

Manual check: `npm run build && npx vite preview`, then compare against https://brs8857.github.io/FM.web/ (the live v1) at 375×812 and 1280×800 on the formation, draft, tactics, ratings-reveal, result and transfer screens. Layout, colours, fonts, spacing and animations must match; the only differences allowed are the new header **Menu** button and the save banner/resume card.

- [ ] **Step 5: Commit**

```bash
git add src/components/screens src/App.jsx src/index.css
git commit -m "Extract the tactics screen and move styles to index.css" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 22: Bug #1 — relegated clubs promoted straight back

**Files:**
- Modify: `src/engine/league.js`, `src/engine/season.test.js`, `tests/golden/league.json`

**Interfaces:**
- Consumes: `createRng`.
- Produces: `drawPromotedClubs(pool, count, excludeNames: Set<string>, rng)`; `applyPromotionRelegation` excludes **survivors and the clubs relegated in this transition**.

- [ ] **Step 1: Write the failing test**

Append to `src/engine/season.test.js`:

```js
describe("bug #1: promotion never brings back a club relegated in the same summer", () => {
  it("holds across 200 seeded transitions", () => {
    const pool = Array.from({ length: 24 }, (_, i) => ({ name: `Club ${i + 1}` }));
    const opponents = pool.slice(0, 19); // rivals share names with the Championship pool, as West Ham and Wolves do
    for (let seed = 1; seed <= 200; seed++) {
      const rng = createRng(seed);
      const order = rng.shuffle(opponents);
      const table = [...order.map((o, i) => ({ name: o.name, isUser: false, position: i + 2 })), { name: "Your XI", isUser: true, position: 1 }];
      const { relegated, promoted, opponents: next } = applyPromotionRelegation(opponents, table, pool, rng);
      expect(promoted.filter((name) => relegated.includes(name)), `seed ${seed}`).toEqual([]);
      expect(next).toHaveLength(19);
    }
  });
});
```

Run: `npx vitest run src/engine/season.test.js`
Expected: FAIL — some seed promotes a just-relegated club.

- [ ] **Step 2: Fix**

`src/engine/league.js`:

```js
// Draws `count` clubs from the Championship pool, excluding every name in
// `excludeNames` — clubs already in the top flight and clubs relegated this
// summer, so nobody bounces straight back up.
export function drawPromotedClubs(pool, count, excludeNames, rng) {
  const available = pool.filter((c) => !excludeNames.has(c.name));
  return rng.shuffle(available).slice(0, count).map((c) => ({ ...c, lastSeason: "promoted" }));
}

export function applyPromotionRelegation(opponents, table, pool, rng) {
  if (!table) return { opponents, relegated: [], promoted: [] };
  const relegatedNames = table.filter((r) => !r.isUser && r.position >= 18).map((r) => r.name);
  if (relegatedNames.length === 0) return { opponents, relegated: [], promoted: [] };
  const survivors = opponents.filter((o) => !relegatedNames.includes(o.name));
  const excludeNames = new Set([...survivors.map((o) => o.name), ...relegatedNames]);
  const promotedClubs = drawPromotedClubs(pool, relegatedNames.length, excludeNames, rng);
  return { opponents: [...survivors, ...promotedClubs], relegated: relegatedNames, promoted: promotedClubs.map((c) => c.name) };
}
```

- [ ] **Step 3: Re-record the league golden file and verify**

Run:

```bash
npm run golden:engine
git diff --stat tests/golden
```

Expected: only `league.json` changes (`seasons.json` is byte-identical because `simulateSeason` did not change).

Run: `npm run lint && npm test && npm run build && npm run e2e`
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add src/engine/league.js src/engine/season.test.js tests/golden/league.json
git commit -m "Fix relegated clubs being promoted straight back (bug #1)" -m "league.json is re-recorded: the promotion draw now excludes this summer's relegated clubs." -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 23: Bug #3 — say when the draft pool falls back to other positions

**Files:**
- Modify: `src/engine/players.js`, `src/engine/players.test.js`, `src/state/initialState.js`, `src/state/reducer.js`, `src/state/save.js`, `src/components/ui/PlayerMiniCard.jsx`, `src/components/screens/DraftScreen.jsx`, `src/App.jsx`, `tests/unit/reducer-career.test.js`
- Create: `src/components/screens/DraftScreen.test.jsx`

**Interfaces:**
- Consumes: `SLOT_TYPE_LABEL`.
- Produces:
  - `buildPool(...)` returns `{ players: Player[], relaxed: boolean }` (no more array property).
  - State field `poolRelaxed: boolean` (false whenever `pool` is emptied; `hydrateState` defaults it to `false`).
  - `DraftScreen` prop `poolRelaxed`; `PlayerMiniCard` prop `positionMismatch`.

- [ ] **Step 1: Write the failing tests**

In `src/engine/players.test.js`, change the two pool tests to read the new shape:

```js
    const { players: all, relaxed } = buildPool(getSquad, "2000", "1", "FB", "R", new Set());
    expect(relaxed).toBe(false);
```

(and use `.players` for `without`), and:

```js
    const { players, relaxed } = buildPool(getSquad, "2005", "3", "DM", null, new Set());
    expect(relaxed).toBe(true);
    expect(players.length).toBe(getSquad("2005", "3").length);
```

Append to `tests/unit/reducer-career.test.js`:

```js
  it("flags a relaxed pool when the landed squad has no player for the slot", () => {
    const dataset = makeMiniDataset();
    const reducer = createReducer(dataset);
    let state = makeInitialState(dataset, 3);
    state = reducer(state, { type: "SET_FORMATION", key: "4-1-4-1" }); // slot 6 is the DM
    state = reducer(state, { type: "SET_ERA", min: 2005, max: 2005 }); // only Gamma Town 2005-06, which has no DM
    state = reducer(state, { type: "START_DRAFT" });
    for (let pick = 0; pick < 5; pick++) {
      state = reducer(reducer(state, { type: "SPIN" }), { type: "LAND" });
      expect(state.poolRelaxed).toBe(false);
      state = reducer(state, { type: "PICK_PLAYER", player: state.pool[0] });
    }
    state = reducer(reducer(state, { type: "SPIN" }), { type: "LAND" });
    expect(state.poolRelaxed).toBe(true);
    state = reducer(state, { type: "PICK_PLAYER", player: state.pool[0] });
    expect(state.poolRelaxed).toBe(false);
  });
```

`src/components/screens/DraftScreen.test.jsx`:

```jsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import DraftScreen from "./DraftScreen.jsx";
import { makeInitialAssignments } from "../../engine/formations.js";
import { makeMiniDataset } from "../../../tests/fixtures/miniDataset.js";
import { createSquadLookup } from "../../engine/players.js";

describe("DraftScreen relaxed pool", () => {
  it("explains the fallback and marks off-position players", () => {
    const dataset = makeMiniDataset();
    const pool = createSquadLookup(dataset)("2005", "3").slice(0, 3);
    render(
      <DraftScreen assignments={makeInitialAssignments("4-1-4-1")} bench={[]} wheel={{ spinning: false, landed: { label: "Gamma Town 2005-06" } }}
        pool={pool} poolRelaxed draftTargetSlotId="DM" draftTargetLabel="Defensive Mid" draftComplete={false}
        eraMin={2005} eraMax={2005} eraIndex={dataset.index} onSpin={vi.fn()} onDoneSpin={vi.fn()} onPick={vi.fn()} onGotoTactics={vi.fn()} />
    );
    expect(screen.getByText("No Defensive Mids in Gamma Town 2005-06. Showing the whole squad.")).toBeTruthy();
    expect(screen.queryByText(/only Defensive Mids/)).toBeNull();
    expect(screen.getAllByTitle("Not a Defensive Mid")).toHaveLength(3);
  });
});
```

Run: `npm test`
Expected: FAIL — `relaxed` undefined on the array, `poolRelaxed` missing, notice text missing.

- [ ] **Step 2: Fix the engine and state**

`src/engine/players.js` — in `buildPool` replace the last two lines (`pool.relaxed = relaxed; return pool;`) with `return { players: pool, relaxed };`.

`src/state/initialState.js` — add `poolRelaxed: false,` after `pool: [],`.

`src/state/reducer.js`:
- `LAND`: `const { players, relaxed } = buildPool(getSquad, entry.y, entry.c, slotType, side, state.draftedIds);` and return `{ ...next, wheel: …, pool: players, poolRelaxed: relaxed }`.
- `SPIN`, `PICK_PLAYER` (both returns) and `SKIP_TO_TACTICS`: wherever `pool: []` is set, also set `poolRelaxed: false`.

`src/state/save.js` — in `hydrateState`, change the first line to `const state = { ...saveState, draftedIds: new Set(saveState.draftedIds), poolRelaxed: Boolean(saveState.poolRelaxed) };` and add `state.poolRelaxed = false;` inside the mid-spin branch.

- [ ] **Step 3: Fix the UI**

`src/components/ui/PlayerMiniCard.jsx` — add `positionMismatch` to the props, and replace `{player.slot}` in the subtitle line with:

```jsx
<span className={positionMismatch ? "text-amber-400 font-bold" : undefined} title={positionMismatch?.title}>{player.slot}</span>
```

and pass it as an object so the card knows the tooltip: `positionMismatch={{ title: "Not a Defensive Mid" }}` or `undefined`.

`src/components/screens/DraftScreen.jsx` — add `poolRelaxed` to the props. Replace the pool heading block (`Squad pool — only … — pick one`) with:

```jsx
            {poolRelaxed ? (
              <p role="note" className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-md px-2 py-1.5 mb-2">
                No {targetLabel}s in {wheel.landed.label}. Showing the whole squad.
              </p>
            ) : (
              <div className="text-xs uppercase tracking-wide text-neutral-400 font-bold mb-2">
                Squad pool — only {targetLabel}s from this club season — pick one
              </div>
            )}
```

where, at the top of the component body, `const targetType = assignments.find((a) => a.slotId === draftTargetSlotId)?.type;` and `const targetLabel = SLOT_TYPE_LABEL[targetType] || "";`. Pass the mismatch to each card:

```jsx
<PlayerMiniCard player={p} onClick={() => onPick(p)} hideRating
  positionMismatch={poolRelaxed && p.slot !== targetType ? { title: `Not a ${targetLabel}` } : undefined} />
```

`src/App.jsx` — pass `poolRelaxed={state.poolRelaxed}` to `<DraftScreen … />`.

- [ ] **Step 4: Verify**

Run: `npm run lint && npm test && npm run build && npm run e2e`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/engine/players.js src/engine/players.test.js src/state src/components/ui/PlayerMiniCard.jsx src/components/screens/DraftScreen.jsx src/components/screens/DraftScreen.test.jsx src/App.jsx tests/unit/reducer-career.test.js
git commit -m "Tell the player when the draft pool falls back to other positions (bug #3)" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 24: Bug #4 — the same real player twice

**Files:**
- Modify: `src/engine/players.js`, `src/engine/players.test.js`, `src/engine/squad.js`, `src/engine/squad.test.js`, `src/state/reducer.js`, `tests/unit/reducer-career.test.js`

**Interfaces:**
- Consumes: `isOwnedIdentity`, `playerIdentity`, `isSameRealPlayer` (Task 13).
- Produces:
  - `buildPool(getSquad, year, clubId, slotType, side, draftedIds, ownedIdentities = [])`.
  - `autoFillBench(getSquad, assignments, draftedIds, ownedIdentities = [])` — never adds someone already owned, nor the same person twice.
  - `generateShortlist(getSquad, index, era, ownedIds, rng, { count = 5, ownedIdentities = [] } = {})` — no owned identities, no duplicate identities within the list.
  - `LAND` with an empty pool resets the wheel (`landed: null`) so the player can spin again.

- [ ] **Step 1: Write the failing tests**

Append to `src/engine/players.test.js`:

```js
import { playerIdentity } from "./identity.js";

describe("bug #4: pools exclude players already owned in another season", () => {
  const getSquad = createSquadLookup(makeMiniDataset());
  const find = (y, c, name) => getSquad(y, c).find((p) => p.name === name);

  it("drops the same person from a later season but keeps a namesake", () => {
    const owned = [playerIdentity(find("2000", "1", "Sam Twice")), playerIdentity(find("2000", "2", "Alan Smith"))];
    const later = buildPool(getSquad, "2001", "1", "ST", null, new Set(), owned).players.map((p) => p.name);
    expect(later).not.toContain("Sam Twice");
    const namesake = buildPool(getSquad, "2010", "4", "ST", null, new Set(), owned).players.map((p) => p.name);
    expect(namesake).toContain("Alan Smith");
  });
});
```

Append to `src/engine/squad.test.js`:

```js
import { playerIdentity, isSameRealPlayer } from "./identity.js";

describe("bug #4: bench and shortlist never duplicate a real player", () => {
  it("autoFillBench skips an owned identity from another drafted season", () => {
    const sam2000 = getSquad("2000", "1").find((p) => p.name === "Sam Twice");
    const squad2001 = getSquad("2001", "1");
    const assignments = makeInitialAssignments("4-3-3").map((a, i) => ({ ...a, player: i === 10 ? sam2000 : squad2001[i + 1] }));
    const drafted = new Set(assignments.map((a) => a.player.id));
    const { bench } = autoFillBench(getSquad, assignments, drafted, assignments.map((a) => playerIdentity(a.player)));
    expect(bench.map((b) => b.player.name)).not.toContain("Sam Twice");
  });

  it("generateShortlist excludes owned identities and repeats nobody", () => {
    const owned = [playerIdentity(getSquad("2000", "1").find((p) => p.name === "Sam Twice"))];
    for (let seed = 1; seed <= 30; seed++) {
      const list = generateShortlist(getSquad, dataset.index, { eraMin: 2000, eraMax: 2011 }, new Set(), createRng(seed), { count: 20, ownedIdentities: owned });
      expect(list.map((p) => p.name)).not.toContain("Sam Twice");
      const ids = list.map(playerIdentity);
      ids.forEach((a, i) => ids.slice(i + 1).forEach((b) => expect(isSameRealPlayer(a, b)).toBe(false)));
    }
  });
});
```

In `tests/unit/reducer-career.test.js`, add `import { playerIdentity, isSameRealPlayer } from "../../src/engine/identity.js";` and extend `checkInvariants`:

```js
  const owned = [...state.assignments, ...state.bench].map((e) => e.player).filter(Boolean).map(playerIdentity);
  owned.forEach((a, i) => owned.slice(i + 1).forEach((b) => expect(isSameRealPlayer(a, b), `${label}: ${a.name}`).toBe(false)));
```

and add:

```js
  it("lets the player spin again when a landed squad has nobody left to draft", () => {
    const dataset = makeMiniDataset();
    const reducer = createReducer(dataset);
    const everyone = ["2000_1", "2000_2"].flatMap((key) => dataset.squads[key].map((row) => `${key}__${row[0]}__${row[5]}__${row[1]}`));
    let state = { ...makeInitialState(dataset, 5), phase: "draft", eraMin: 2000, eraMax: 2000, draftedIds: new Set(everyone) };
    state = reducer(reducer(state, { type: "SPIN" }), { type: "LAND" });
    expect(state.wheel).toEqual({ spinning: false, landed: null });
    expect(state.pool).toEqual([]);
  });
```

Run: `npm test`
Expected: FAIL — Sam Twice appears; invariant fails for some action; the empty-pool test lands anyway.

- [ ] **Step 2: Fix the engine**

`src/engine/players.js` — add `import { isOwnedIdentity } from "./identity.js";`, add the `ownedIdentities = []` parameter to `buildPool`, and make both filters exclude owned people:

```js
  const available = (p) => !draftedIds.has(p.id) && !isOwnedIdentity(ownedIdentities, p);
  let pool = squad.filter((p) => available(p) && slotAccepts(slotType, p));
  let relaxed = false;
  if (pool.length === 0) { pool = squad.filter(available); relaxed = true; }
```

`src/engine/squad.js` — add `import { isOwnedIdentity, playerIdentity } from "./identity.js";`.

`autoFillBench(getSquad, assignments, draftedIds, ownedIdentities = [])`:

```js
  const identities = [...ownedIdentities];
  const free = (p) => !dids.has(p.id) && !isOwnedIdentity(identities, p);
  const gk = remaining.filter((p) => p.slot === "GK" && free(p)).sort((a, b) => b.ov - a.ov)[0];
  const others = remaining.filter((p) => p.slot !== "GK").sort((a, b) => b.ov - a.ov);
  const bench = [];
  if (gk) { bench.push(gk); dids.add(gk.id); identities.push(playerIdentity(gk)); }
  for (const p of others) {
    if (bench.length >= 6) break;
    if (!free(p)) continue;
    bench.push(p); dids.add(p.id); identities.push(playerIdentity(p));
  }
```

`generateShortlist(getSquad, index, { eraMin, eraMax }, ownedIds, rng, { count = 5, ownedIdentities = [] } = {})` — keep the sampling; replace the final line with:

```js
  const picked = [];
  const identities = [...ownedIdentities];
  for (const p of rng.shuffle(pool)) {
    if (picked.length >= count) break;
    if (isOwnedIdentity(identities, p)) continue;
    picked.push(p);
    identities.push(playerIdentity(p));
  }
  return picked;
```

- [ ] **Step 3: Fix the reducer**

- `LAND`: pass `state.draftedIdentities` to `buildPool`; after building, if `players.length === 0` return `{ ...next, wheel: { spinning: false, landed: null }, pool: [], poolRelaxed: false }`.
- `PICK_PLAYER`: `autoFillBench(getSquad, assignments, draftedIds, draftedIdentities)`.
- `GOTO_TRANSFER`: `generateShortlist(getSquad, dataset.index, { eraMin: state.eraMin, eraMax: state.eraMax }, state.draftedIds, rng, { ownedIdentities: state.draftedIdentities })`.

Update the existing shortlist test call in `src/engine/squad.test.js` (from Task 10) — its signature still works because the options object is optional.

- [ ] **Step 4: Verify**

Run: `npm run lint && npm test && npm run build && npm run e2e`
Expected: all green, including the determinism tests (same seed still replays identically).

- [ ] **Step 5: Commit**

```bash
git add src/engine src/state/reducer.js tests/unit/reducer-career.test.js
git commit -m "Stop the same real player appearing twice across seasons (bug #4)" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 25: Bug #6 — wrong text after season 1

**Files:**
- Modify: `src/engine/season.js`, `src/engine/season.test.js`, `src/components/screens/ResultCard.jsx`, `src/components/screens/screens.test.jsx`

**Interfaces:**
- Consumes: `simulation.season`.
- Produces: `seasonTier` 38-win `sub` = `"38 wins from 38 — a perfect season no Premier League side has ever managed."`; the result-table caption depends on the season.

- [ ] **Step 1: Write the failing tests**

Append to the `season tiers` block in `src/engine/season.test.js`:

```js
  it("describes a perfect season without contradicting itself", () => {
    expect(seasonTier({ w: 38, l: 0, pts: 114, position: 1 }).sub).toBe("38 wins from 38 — a perfect season no Premier League side has ever managed.");
  });
```

Append to `src/components/screens/screens.test.jsx`:

```jsx
  it("ResultCard caption mentions Fulham only in season 1", () => {
    const { state } = seasonOneResult();
    const props = { formationKey: state.formationKey, assignments: state.assignments, onReset: vi.fn(), onContinue: vi.fn(), instant: true };
    const { unmount } = render(<ResultCard simulation={state.simulation} {...props} />);
    expect(screen.getByText(/with your XI taking Fulham's place/)).toBeTruthy();
    unmount();
    render(<ResultCard simulation={{ ...state.simulation, season: 2 }} {...props} />);
    expect(screen.queryByText(/Fulham/)).toBeNull();
    expect(screen.getByText(/This season's 19 Premier League clubs alongside your XI/)).toBeTruthy();
  });
```

Run: `npm test`
Expected: FAIL on both.

- [ ] **Step 2: Fix**

`src/engine/season.js` — in `seasonTier`, the 38-win line becomes:

```js
  if (w === 38) return { name: "THE PERFECT SEASON", sub: "38 wins from 38 — a perfect season no Premier League side has ever managed.", color: "amber" };
```

`src/components/screens/ResultCard.jsx` — replace the caption paragraph under `Final Table` with:

```jsx
          <p className="text-xs text-neutral-500 mb-2">
            {season === 1
              ? "The real 19 top-flight rivals, with your XI taking Fulham's place."
              : "This season's 19 Premier League clubs alongside your XI."}
            {" "}Rivals' points are estimated from squad strength; yours are your actual simulated results.
          </p>
```

- [ ] **Step 3: Verify**

Run: `npm run lint && npm test && npm run build && npm run e2e`
Expected: all green. The golden seasons have no 38-win season (the v1 capture peaked at 33 wins), so `seasons.json` should not change; if a golden test fails **only** on `tier.sub` of a 38-win season, run `npm run golden:engine` and include `tests/golden/seasons.json` in this commit with a note in the message.

- [ ] **Step 4: Commit**

```bash
git add src/engine/season.js src/engine/season.test.js src/components/screens/ResultCard.jsx src/components/screens/screens.test.jsx
git commit -m "Fix season-specific result text (bug #6)" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 26: Bug #7 — touch drag-and-drop running the drop twice

**Files:**
- Modify: `src/components/pitch/usePitchDrag.js`, `src/components/pitch/usePitchDrag.test.jsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `usePitchDrag` listens only to `pointerup` and `pointercancel`, handles each drag's drop at most once, and `startDrag` is a stable callback.

- [ ] **Step 1: Write the failing tests**

Append inside the `describe("usePitchDrag", …)` block of `src/components/pitch/usePitchDrag.test.jsx`:

```jsx
  it("handles a touch drop exactly once even when touchend and a duplicate pointerup follow (bug #7)", () => {
    const { dispatch, hook } = start("slot", "GK");
    pointAt("st");
    act(() => {
      release();
      const touchEnd = new Event("touchend");
      touchEnd.changedTouches = [{ clientX: 100, clientY: 150 }];
      window.dispatchEvent(touchEnd);
      release();
    });
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(hook.result.current.dragInfo).toBeNull();
  });

  it("cancels the drag without dropping when the browser cancels the pointer", () => {
    const { dispatch, hook } = start("slot", "GK");
    act(() => { window.dispatchEvent(new PointerEvent("pointercancel")); });
    expect(dispatch).not.toHaveBeenCalled();
    expect(hook.result.current.dragInfo).toBeNull();
  });
```

Run: `npx vitest run src/components/pitch`
Expected: FAIL — `dispatch` called 3 times; `pointercancel` leaves `dragInfo` set.

- [ ] **Step 2: Fix**

Replace `src/components/pitch/usePitchDrag.js` with:

```js
import { useCallback, useEffect, useRef, useState } from "react";

// Global pointer-up coordinator for the pitch/bench drag system. Pointer events
// cover mouse, pen and touch, so no separate touch listeners are needed (having
// both ran every touch drop twice — bug #7). On release we hit-test whatever
// DOM element is under the pointer: land on another player -> swap; land on
// open pitch space -> move there; land on the bench -> swap on/off the pitch.
export function usePitchDrag({ assignments, dispatch }) {
  const [dragInfo, setDragInfo] = useState(null); // { kind: 'slot'|'bench', id }
  const handled = useRef(false);

  const startDrag = useCallback((kind, id) => {
    handled.current = false;
    setDragInfo({ kind, id });
  }, []);

  useEffect(() => {
    if (!dragInfo) return undefined;

    function onUp(e) {
      if (handled.current) return;
      handled.current = true;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (el) {
        const slotEl = el.closest("[data-slot-id]");
        const benchEl = el.closest("[data-bench-idx]");
        const pitchZone = el.closest('[data-drop-zone="pitch"]');
        if (slotEl) {
          const toId = slotEl.getAttribute("data-slot-id");
          if (!(dragInfo.kind === "slot" && dragInfo.id === toId)) {
            dispatch({ type: "SWAP_PLAYERS", fromKind: dragInfo.kind, fromId: dragInfo.id, toKind: "slot", toId });
          }
        } else if (benchEl) {
          const toId = Number(benchEl.getAttribute("data-bench-idx"));
          dispatch({ type: "SWAP_PLAYERS", fromKind: dragInfo.kind, fromId: dragInfo.id, toKind: "bench", toId });
        } else if (pitchZone) {
          const rect = pitchZone.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          if (dragInfo.kind === "slot") {
            dispatch({ type: "MOVE_PLAYER", slotId: dragInfo.id, x, y });
          } else {
            // bench player dropped on open pitch -> swap into the nearest slot
            let nearest = null, nearestDist = Infinity;
            assignments.forEach((a) => {
              const d = Math.hypot(a.pos.x - x, a.pos.y - y);
              if (d < nearestDist) { nearestDist = d; nearest = a.slotId; }
            });
            if (nearest) dispatch({ type: "SWAP_PLAYERS", fromKind: "bench", fromId: dragInfo.id, toKind: "slot", toId: nearest });
          }
        }
      }
      setDragInfo(null);
    }

    function onCancel() {
      handled.current = true;
      setDragInfo(null);
    }

    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    return () => {
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
  }, [dragInfo, assignments, dispatch]);

  return { dragInfo, startDrag };
}
```

- [ ] **Step 3: Verify**

Run: `npx vitest run src/components/pitch`
Expected: PASS, 7 tests.

Run: `npm run lint && npm test && npm run build && npm run e2e`
Expected: all green.

Manual: on a real phone (or Chrome DevTools device mode with touch), drag a player onto a teammate on the tactics board — they swap and **stay** swapped.

- [ ] **Step 4: Commit**

```bash
git add src/components/pitch/usePitchDrag.js src/components/pitch/usePitchDrag.test.jsx
git commit -m "Handle each touch drop once (bug #7)" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 27: Balance report script

**Files:**
- Create: `scripts/sim.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: engine modules, `src/data/players.json`.
- Produces: `npm run sim [-- runs]` printing title, bottom-three and average-points by formation × drafting strategy × style. Report only in Phase 1 (spec §9.4).

- [ ] **Step 1: Write the script**

`scripts/sim.mjs`:

```js
// Balance report: how often each style wins the title or finishes bottom three.
// Usage: npm run sim            (400 seasons per cell)
//        npm run sim -- 50      (quicker)
import { readFileSync } from "node:fs";
import { createRng } from "../src/engine/rng.js";
import { createSquadLookup, buildPool } from "../src/engine/players.js";
import { makeInitialAssignments } from "../src/engine/formations.js";
import { defaultRoleFor, defaultDutyFor } from "../src/engine/roles.js";
import { STYLE_PRESETS } from "../src/engine/instructions.js";
import { computeFamiliarity } from "../src/engine/familiarity.js";
import { computeTeamProfile } from "../src/engine/tactics.js";
import { simulateSeason } from "../src/engine/season.js";

const RUNS = Number(process.argv[2] ?? 400);
const dataset = JSON.parse(readFileSync("src/data/players.json", "utf8"));
const getSquad = createSquadLookup(dataset);

function draft(formationKey, strategy, rng) {
  const drafted = new Set();
  return makeInitialAssignments(formationKey).map((slot) => {
    let players = [];
    while (players.length === 0) {
      const entry = rng.pick(dataset.index);
      players = buildPool(getSquad, entry.y, entry.c, slot.type, slot.side, drafted).players;
    }
    const player = strategy === "best" ? players[0] : rng.pick(players);
    drafted.add(player.id);
    const role = defaultRoleFor(slot.type);
    return { ...slot, player, role, duty: defaultDutyFor(role) };
  });
}

const rows = [];
let seed = 1;
for (const formationKey of ["4-3-3", "4-2-3-1"]) {
  for (const strategy of ["best", "random"]) {
    for (const style of STYLE_PRESETS) {
      let points = 0, titles = 0, bottomThree = 0;
      for (let run = 0; run < RUNS; run++) {
        const rng = createRng(seed++);
        const xi = draft(formationKey, strategy, rng);
        const familiarity = computeFamiliarity(xi, style.instructions, formationKey);
        const profile = computeTeamProfile(xi, style.instructions, familiarity);
        const season = simulateSeason(profile, familiarity, dataset.opponents, rng);
        points += season.pts;
        if (season.position === 1) titles++;
        if (season.position >= 18) bottomThree++;
      }
      rows.push({
        formation: formationKey, strategy, style: style.key,
        avgPts: (points / RUNS).toFixed(1),
        titlePct: Math.round((100 * titles) / RUNS),
        bottom3Pct: Math.round((100 * bottomThree) / RUNS),
      });
    }
  }
}
console.table(rows);
```

Add script `"sim": "node scripts/sim.mjs"`.

- [ ] **Step 2: Run it**

Run: `npm run sim -- 50`
Expected: a 28-row table. `counter` should have a high `titlePct` for the `best` strategy and `parkbus` a low one — the imbalance the code review found and Phase 2 will fix.

Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add scripts/sim.mjs package.json
git commit -m "Add npm run sim balance report" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 28: Cleanup and zero lint warnings

**Files:**
- Modify: `src/engine/tactics.js`, `src/components/screens/RoleEditor.jsx`, `src/components/screens/DraftScreen.jsx`, `src/components/screens/WheelSpinner.jsx`, `src/components/screens/ResultCard.jsx`, `src/App.jsx`, `eslint.config.js`, `package.json`

**Interfaces:**
- Consumes: nothing new.
- Produces: `npm run lint` runs `eslint . --max-warnings 0`; `no-unused-vars` is an error; the only `eslint-disable` left in `src` is WheelSpinner's rule-specific `no-restricted-properties` line.

- [ ] **Step 1: Make lint strict (it fails)**

`eslint.config.js`: `"no-unused-vars": "warn"` → `"no-unused-vars": "error"` (delete the comment above it).
`package.json`: `"lint": "eslint . --max-warnings 0"`.

Run: `npm run lint`
Expected: FAIL — 4 errors: `foc`, `neutralRole`, `formationKey` (DraftScreen), `draftedIds` (App).

- [ ] **Step 2: Remove the leftovers**

- `src/engine/tactics.js`, `identitySynergy`: delete `focus: foc, ` from the destructuring.
- `src/components/screens/RoleEditor.jsx`: delete the line `const neutralRole = { att: 0.5, def: 0.5 }; // baseline for showing deltas`.
- `src/components/screens/DraftScreen.jsx`: remove `formationKey` from the props; in `src/App.jsx` stop passing `formationKey={formationKey}` to `<DraftScreen>`.
- `src/App.jsx`: remove `draftedIds` from `const { … } = state;`.

- [ ] **Step 3: Replace the two bare `eslint-disable-next-line` comments**

`src/components/screens/WheelSpinner.jsx` — keep the spin effect keyed only on `spinning`, reading the latest `pool` and `onDone` through refs. Add after the existing refs:

```jsx
  const poolRef = useRef(pool);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    poolRef.current = pool;
    onDoneRef.current = onDone;
  });
```

In the spin effect: `const idx = pool;` → `const idx = poolRef.current;`, `onDone();` → `onDoneRef.current();`, and delete the bare `// eslint-disable-next-line` above `}, [spinning]);`.

`src/components/screens/ResultCard.jsx` — delete the bare `// eslint-disable-next-line` and change the effect's dependency array from `[simulation]` to `[simulation, total, instant]` (`total` comes from `simulation`, and `instant` does not change while the result screen is shown).

- [ ] **Step 4: Verify**

Run: `npm run lint`
Expected: exit 0, no warnings.

Run: `grep -rn "eslint-disable" src`
Expected: exactly one line — `src/components/screens/WheelSpinner.jsx: // eslint-disable-next-line no-restricted-properties -- cosmetic flicker only; …`.

Run: `npm test && npm run build && npm run e2e`
Expected: all green; `golden-profiles` still passes (removing an unused variable changes no numbers).

- [ ] **Step 5: Commit**

```bash
git add src eslint.config.js package.json
git commit -m "Remove leftover unused code and make lint warnings fail" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 29: Release v1.1.0

**Files:**
- Create: `CHANGELOG.md`
- Modify: `package.json`, `package-lock.json`, `README.md`, `docs/roadmap.md`

**Interfaces:**
- Consumes: everything above.
- Produces: tag `v1.1.0`, live site showing `FM.WEB v1.1.0` in the header menu.

- [ ] **Step 1: Bump the version**

Run: `npm version 1.1.0 --no-git-tag-version`
Expected: `v1.1.0`; `package.json` and `package-lock.json` updated.

- [ ] **Step 2: Write the changelog**

Run `date +%F` and use its output as the release date. `CHANGELOG.md`:

```markdown
# Changelog

## 1.1.0 — (release date from `date +%F`)

### Added
- Autosave on every device, with a **Continue career** card when you come back.
- **Export save** / **Import save** in the header menu, to move a career between devices.
- A crash screen that can export your saved career before starting over.
- Player data loads separately from the app, with a Retry button if it fails.

### Fixed
- Clubs relegated in a summer can no longer be promoted straight back.
- The draft says when a squad has no player for the slot, and marks off-position players.
- The same real player can no longer be in your squad twice from different seasons.
- Result tables from season 2 onwards no longer mention Fulham; the perfect-season text no longer contradicts itself.
- Dragging players on touch screens no longer swaps them straight back.

### Changed
- Every random event comes from a career seed, so a saved career always replays the same way.
- The code is split into data, engine, state and component modules, with unit, golden-master and browser tests in CI.
- CI runs on Node 24 and only deploys when every check passes.
```

Replace `(release date from \`date +%F\`)` in the file with that actual date (e.g. `2026-10-02`) before committing.

- [ ] **Step 3: Update the README**

In `README.md`:
1. Replace the **Project structure** section with:

````markdown
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
````

2. Add after **Running the real dev project**:

````markdown
## Checks

```bash
npm run lint      # ESLint, zero warnings allowed
npm test          # Vitest unit, component and golden-master tests
npm run e2e       # Playwright (first run: npx playwright install chromium webkit)
npm run sim       # balance report (title / relegation odds by style)
```

Careers autosave in the browser. Use **Menu → Export save** to back one up or move it to another device.
````

3. In **Quickest way to try it**, add: "`standalone/index.html` is still the v1.0 build; it will be regenerated automatically in v2.0." and remove any mention of the Windows desktop build.

- [ ] **Step 4: Update the roadmap**

In `docs/roadmap.md`, change the Phase 1 table row status from `**Next**` to `v1.1 foundation shipped; v2.0 in progress`.

- [ ] **Step 5: Final verification**

Run: `npm run lint && npm test && npm run build && npm run e2e`
Expected: all green.

Run: `npm run preview`, open the printed URL: **Menu** shows `FM.WEB v1.1.0`; draft an XI, reload, and **Continue career** appears.

- [ ] **Step 6: Commit and tag**

```bash
git add CHANGELOG.md package.json package-lock.json README.md docs/roadmap.md
git commit -m "Release 1.1.0" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git tag -a v1.1.0 -m "FM.WEB 1.1.0"
```

- [ ] **Step 7: Publish (owner approval required)**

Pushing publishes the release. **Ask the owner before running:**

```bash
git push origin main
git push origin v1.1.0
```

Then:
1. Watch the `CI` workflow on GitHub until `check` and `deploy` are green.
2. Open https://brs8857.github.io/FM.web/ — Menu shows `FM.WEB v1.1.0`, a draft survives a reload.
3. The owner creates the GitHub release from tag `v1.1.0` (Releases → Draft a new release) and pastes the 1.1.0 section of `CHANGELOG.md` as the notes.
4. The owner plays a career on their phone and desktop and signs off v1.1 (spec §12). Plan 1B is written after that.
