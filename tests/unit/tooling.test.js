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

  it("normalises line endings to LF", () => {
    expect(readFileSync(".gitattributes", "utf8")).toMatch(/^\* text=auto eol=lf$/m);
  });
});
