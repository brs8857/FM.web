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
