// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";

describe("tooling", () => {
  it("parses JSON data as JSON.parse and keeps relative asset paths", async () => {
    const { default: configure, manifest } = await import("../../vite.config.js");
    const config = configure({ mode: "production", command: "build" });
    expect(config.base).toBe("./");
    expect(config.json).toEqual({ stringify: true });
    expect(manifest).toMatchObject({ name: "Era XI", display: "standalone", start_url: "./", scope: "./" });
    expect(manifest.icons.map((i) => i.src)).toEqual(["icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png"]);
    for (const icon of manifest.icons) expect(existsSync(`public/${icon.src}`), icon.src).toBe(true);
    expect(existsSync("public/icons/apple-touch-icon.png")).toBe(true);
  });

  it("builds the standalone single file without a service worker", async () => {
    const { default: configure } = await import("../../vite.config.js");
    const config = configure({ mode: "standalone", command: "build" });
    expect(config.build.outDir).toBe("dist/standalone");
    expect(config.plugins.flat().some((p) => p.name === "vite:singlefile")).toBe(true);
  });

  it("keeps the bundle budget script honest", async () => {
    const { BUDGET_KB } = await import("../../scripts/check-bundle-size.mjs");
    expect(BUDGET_KB).toBe(120);
  });

  it("holds the balance report to the plan's C5 thresholds", async () => {
    const { THRESHOLDS, violations } = await import("../../scripts/sim.mjs");
    expect(THRESHOLDS).toEqual({ title: [12, 45], bottomThree: [3, 12] });
    const row = (strategy, titlePct, bottom3Pct) => ({ formation: "4-3-3", strategy, style: "counter", avgPts: 60, titlePct, bottom3Pct });
    expect(violations([row("best", 12, 0), row("best", 45, 0), row("random", 0, 3), row("random", 60, 12)])).toEqual([]);
    expect(violations([row("best", 45.3, 0), row("best", 11.8, 0), row("random", 0, 2.8), row("random", 0, 12.3)])).toHaveLength(4);
  });

  it("fails the settling check when changing the system every week out-points keeping it", async () => {
    const { settlingViolations } = await import("../../scripts/sim.mjs");
    const row = (play, avgPts) => ({ formation: "4-3-3", draft: "best", play, avgPts, titlePct: 0, bottom3Pct: 0 });
    expect(settlingViolations([row("batch", 70), row("keep", 70), row("weekly", 70), row("lean", 69.9)])).toEqual([]);
    expect(settlingViolations([row("batch", 70), row("keep", 70), row("weekly", 70.1), row("lean", 71)])).toHaveLength(2);
  });

  it("normalises line endings to LF", () => {
    expect(readFileSync(".gitattributes", "utf8")).toMatch(/^\* text=auto eol=lf$/m);
  });
});
