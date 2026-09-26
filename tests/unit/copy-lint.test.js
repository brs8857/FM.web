// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Spec 04 §11 / plan §3: product copy never uses these marks. Since B11 the
// scan covers all of src/ and index.html, and since C1 the engine too. Two
// exclusions, both deliberate: src/data holds the archive's real names, and
// the save envelope's app id stays "fm-web" so 1.1.0 saves still load.
const BANNED = /football manager|premier league|\bFM\b/i;
const ROOT = "src";
const SKIP_DIRS = new Set(["src/data"]);
const FILES = ["index.html", "README.md", "package.json"];
const ALLOWED_LINES = [/APP_ID = "fm-web"/, /"name": "fm-web"/, /github\.io\/FM\.web\//];

function walk(dir, out = []) {
  if (SKIP_DIRS.has(dir)) return out;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(jsx?|json|css|html)$/.test(name) && !/\.test\.jsx?$/.test(name)) out.push(path);
  }
  return out;
}

describe("copy lint", () => {
  const files = [...walk(ROOT), ...FILES];

  it("scans the whole source tree, the page, the README and the manifest", () => {
    expect(files.length).toBeGreaterThan(120);
    expect(files.some((f) => f.startsWith("src/state/"))).toBe(true);
    expect(files.some((f) => f.startsWith("src/engine/"))).toBe(true);
    expect(files.some((f) => f.startsWith("src/screens/"))).toBe(true);
  });

  it.each(files)("%s has no banned terms", (file) => {
    const text = readFileSync(file, "utf8");
    const hits = text.split("\n").map((line, i) => [i + 1, line])
      .filter(([, line]) => BANNED.test(line) && !ALLOWED_LINES.some((ok) => ok.test(line)));
    expect(hits, hits.map(([n, line]) => `${n}: ${line.trim()}`).join("\n")).toEqual([]);
  });
});
