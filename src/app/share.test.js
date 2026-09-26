import { describe, it, expect, vi } from "vitest";
import { shareSlip, renderSlip, SHARE_WIDTH, SHARE_HEIGHT } from "./share.js";

const slip = {
  kicker: "Season 2 · 2027-28", headline: "Champions", standfirst: "Champions of England. The trophy, the open-top bus, the lot.",
  record: "Won 26, drawn 8, lost 4 · 86 pts · 1st", eleven: ["Seaman", "Dixon", "Adams", "Keown", "Winterburn", "Parlour", "Vieira", "Petit", "Overmars", "Bergkamp", "Anelka"],
  code: "AB-CD-EF-GH-JK-LM", fileName: "era-xi-season-2",
};

function fakeContext() {
  const calls = [];
  const ctx = new Proxy({ measureText: (text) => ({ width: text.length * 20 }) }, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === "textAlign" || prop === "font" || prop === "fillStyle") return undefined;
      return (...args) => calls.push([prop, ...args]);
    },
    set() { return true; },
  });
  return { ctx, calls };
}

function fakeCanvas(ctx) {
  return { width: 0, height: 0, getContext: () => ctx, toBlob: (cb) => cb(new Blob(["png"], { type: "image/png" })) };
}

describe("share", () => {
  it("draws the headline, the eleven and the code at 1080×1350", () => {
    const { ctx, calls } = fakeContext();
    renderSlip(ctx, slip);
    const texts = calls.filter(([m]) => m === "fillText").map(([, text]) => text);
    expect(calls[0]).toEqual(["fillRect", 0, 0, SHARE_WIDTH, SHARE_HEIGHT]);
    expect(texts).toContain("Champions");
    expect(texts).toContain("BERGKAMP");
    expect(texts.some((t) => t.includes("AB-CD-EF-GH-JK-LM"))).toBe(true);
    expect(texts).toContain("#EraXI");
  });

  it("uses the system share sheet when files can be shared", async () => {
    const { ctx } = fakeContext();
    const canvas = fakeCanvas(ctx);
    const nav = { canShare: vi.fn(() => true), share: vi.fn(() => Promise.resolve()) };
    const doc = { createElement: () => ({}), body: { appendChild() {} } };
    expect(await shareSlip(slip, { nav, doc, createCanvas: () => canvas })).toBe("shared");
    expect(canvas.width).toBe(SHARE_WIDTH);
    const [{ files, text }] = nav.share.mock.calls[0];
    expect(files[0].name).toBe("era-xi-season-2.png");
    expect(text).toContain("Career code AB-CD-EF-GH-JK-LM #EraXI");
  });

  it("falls back to a download and the clipboard, and reports a cancelled share", async () => {
    const { ctx } = fakeContext();
    const link = { click: vi.fn(), remove: vi.fn() };
    const doc = { createElement: () => link, body: { appendChild: vi.fn() } };
    const clipboard = { writeText: vi.fn(() => Promise.resolve()) };
    globalThis.URL.createObjectURL ??= () => "blob:x";
    globalThis.URL.revokeObjectURL ??= () => {};
    expect(await shareSlip(slip, { nav: { clipboard }, doc, createCanvas: () => fakeCanvas(ctx) })).toBe("downloaded");
    expect(link.download).toBe("era-xi-season-2.png");
    expect(link.click).toHaveBeenCalledOnce();
    expect(clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining("Champions"));

    const abort = Object.assign(new Error("cancel"), { name: "AbortError" });
    const nav = { canShare: () => true, share: () => Promise.reject(abort) };
    expect(await shareSlip(slip, { nav, doc, createCanvas: () => fakeCanvas(ctx) })).toBe("cancelled");
  });
});
