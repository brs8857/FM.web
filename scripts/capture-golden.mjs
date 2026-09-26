// Records engine outputs as golden-master files.
//   node scripts/capture-golden.mjs            -> all four files from the v1 source (6495fb8)
//   node scripts/capture-golden.mjs --engine   -> profiles/seasons/league from src/engine (plan C5)
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
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
    console.log(name.padEnd(14), String(Buffer.byteLength(text, "utf8")).padStart(9), "bytes", hash);
  }
}

// Records profiles, seasons and league from src/engine: the same 20 XIs and
// seed-to-XI mapping as the v1 capture, run through today's engine.
async function recordFromEngine(outDir) {
  const { STYLE_PRESETS } = await import("../src/engine/instructions.js");
  const { computeFamiliarity } = await import("../src/engine/familiarity.js");
  const { computeTeamProfile } = await import("../src/engine/tactics.js");
  const { tacticalReadout } = await import("../src/engine/readout.js");
  const { simulateSeason } = await import("../src/engine/season.js");
  const { applyPromotionRelegation } = await import("../src/engine/league.js");
  const { createRng } = await import("../src/engine/rng.js");
  const E = { STYLE_PRESETS, computeFamiliarity, computeTeamProfile, tacticalReadout };
  const players = JSON.parse(readFileSync("src/data/players.json", "utf8"));
  const championship = JSON.parse(readFileSync("src/data/championship.json", "utf8"));
  const xis = JSON.parse(readFileSync("tests/golden/xis.json", "utf8"));
  const profiles = captureProfiles(E, xis);
  const seasons = seasonInputs(E, xis).map((input) => ({
    ...input,
    result: simulateSeason(input.profile, input.familiarity, players.opponents, createRng(input.seed)),
  }));
  const league = seasons.map((s) => ({
    seed: 1000 + s.seed,
    table: s.result.table,
    result: applyPromotionRelegation(players.opponents, s.result.table, championship, createRng(1000 + s.seed)),
  }));
  writeGolden(outDir, { "profiles.json": profiles, "seasons.json": seasons, "league.json": league });
}

async function main() {
  const args = process.argv.slice(2);
  const outIndex = args.indexOf("--out");
  const outDir = outIndex >= 0 ? args[outIndex + 1] : "tests/golden";
  if (args.includes("--engine")) {
    await recordFromEngine(outDir);
    return;
  }
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

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
