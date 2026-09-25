// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Spec 04 §11 / plan §3: product copy never uses these marks. Scoped to the
// new tree until B11 retires src/components, when it widens to all of src/.
const BANNED = /football manager|premier league|\bFM\b/i;
const ROOTS = ["src/content", "src/screens", "src/ui", "src/pitch", "src/app", "src/styles"];
const FILES = ["index.html"];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(jsx?|json|css|html)$/.test(name) && !/\.test\.jsx?$/.test(name)) out.push(path);
  }
  return out;
}

describe("copy lint", () => {
  const files = [...ROOTS.flatMap((root) => walk(root)), ...FILES];

  it("scans the new tree and index.html", () => {
    expect(files.length).toBeGreaterThan(40);
  });

  it.each(files)("%s has no banned terms", (file) => {
    const text = readFileSync(file, "utf8");
    const hits = text.split("\n").map((line, i) => [i + 1, line]).filter(([, line]) => BANNED.test(line));
    expect(hits, hits.map(([n, line]) => `${n}: ${line.trim()}`).join("\n")).toEqual([]);
  });
});
