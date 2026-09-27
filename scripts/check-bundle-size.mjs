// Bundle budget (Phase 1 spec §7.3): app code gzipped ≤ 120 KB, with the
// data chunk emitted separately so it caches independently of releases.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

export const BUDGET_KB = 120;
const DATA_CHUNKS = /^(players|championship)-/;
// The component gallery (?gallery=1) is a review page loaded on its own; no
// player downloads it, so it is reported but not counted.
const REVIEW_CHUNKS = /^Gallery-/;

export function measure(dir = "dist/assets") {
  const files = readdirSync(dir).filter((f) => f.endsWith(".js"));
  const app = files.filter((f) => !DATA_CHUNKS.test(f) && !REVIEW_CHUNKS.test(f));
  const review = files.filter((f) => REVIEW_CHUNKS.test(f));
  const data = files.filter((f) => DATA_CHUNKS.test(f));
  const gz = (f) => gzipSync(readFileSync(join(dir, f))).length;
  const appBytes = app.reduce((sum, f) => sum + gz(f), 0);
  return { app, data, review, reviewKb: review.reduce((sum, f) => sum + gz(f), 0) / 1024, appKb: appBytes / 1024, dataKb: data.reduce((sum, f) => sum + gz(f), 0) / 1024, raw: app.reduce((sum, f) => sum + statSync(join(dir, f)).size, 0) };
}

if (process.argv[1] && process.argv[1].endsWith("check-bundle-size.mjs")) {
  const m = measure();
  console.log(`app code: ${m.appKb.toFixed(1)} KB gzipped across ${m.app.length} file(s); data: ${m.dataKb.toFixed(1)} KB in ${m.data.map((f) => f.replace(/-[^-]+\.js$/, "")).join(", ") || "none"}; gallery (not counted): ${m.reviewKb.toFixed(1)} KB`);
  let failed = false;
  if (!m.data.some((f) => f.startsWith("players-"))) { console.error("the player data is not a separate chunk"); failed = true; }
  if (m.appKb > BUDGET_KB) { console.error(`app code is over the ${BUDGET_KB} KB budget`); failed = true; }
  process.exit(failed ? 1 : 0);
}
