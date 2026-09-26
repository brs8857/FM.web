import { PRODUCT_NAME, SHARE_TAG } from "../content/product.js";

export const SHARE_WIDTH = 1080;
export const SHARE_HEIGHT = 1350;

function cssVar(name, fallback) {
  if (typeof getComputedStyle !== "function") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function wrap(ctx, text, maxWidth, separator = " ") {
  const words = text.split(separator);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line}${separator}${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) { lines.push(line); line = word; } else line = candidate;
  }
  if (line) lines.push(line);
  return lines;
}

export function renderSlip(ctx, slip) {
  const paper = cssVar("--paper", "#F4F4F0"), ink = cssVar("--ink", "#1A1B18"), ink2 = cssVar("--ink-2", "#4D5047");
  const rule = cssVar("--rule", "#CDCFC5");
  const display = '"Newsreader", Georgia, serif', body = '"Barlow", sans-serif', mono = '"Courier Prime", "Courier New", monospace';
  const margin = 80, width = SHARE_WIDTH - margin * 2;
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, SHARE_WIDTH, SHARE_HEIGHT);

  let y = margin + 50;
  ctx.fillStyle = ink;
  ctx.font = `800 64px ${display}`;
  ctx.fillText(PRODUCT_NAME, margin, y);
  ctx.fillStyle = ink2;
  ctx.font = `600 30px ${body}`;
  ctx.textAlign = "right";
  ctx.fillText(slip.kicker, SHARE_WIDTH - margin, y);
  ctx.textAlign = "left";
  y += 28;
  ctx.fillStyle = ink;
  ctx.fillRect(margin, y, width, 4);
  ctx.fillRect(margin, y + 10, width, 2);

  y += 150;
  ctx.fillStyle = ink;
  ctx.font = `800 150px ${display}`;
  for (const line of wrap(ctx, slip.headline, width)) { ctx.fillText(line, margin, y); y += 140; }

  y -= 40;
  ctx.font = `400 42px ${body}`;
  ctx.fillStyle = ink2;
  for (const line of wrap(ctx, slip.standfirst, width)) { ctx.fillText(line, margin, y); y += 54; }

  y += 40;
  ctx.fillStyle = ink;
  ctx.font = `700 40px ${mono}`;
  const record = wrap(ctx, slip.record, width, " · ");
  record.forEach((line, i) => ctx.fillText(line, margin, y + i * 48));
  y += (record.length - 1) * 48;
  if (slip.topScorer) {
    y += 50;
    ctx.fillStyle = ink2;
    ctx.font = `400 34px ${mono}`;
    ctx.fillText(slip.topScorer, margin, y);
  }
  y += 50;
  ctx.fillStyle = rule;
  ctx.fillRect(margin, y, width, 3);

  y += 60;
  ctx.fillStyle = ink;
  ctx.font = `700 34px ${mono}`;
  const column = Math.ceil(slip.eleven.length / 2);
  slip.eleven.forEach((name, i) => {
    const x = margin + (i < column ? 0 : width / 2);
    const row = i < column ? i : i - column;
    ctx.fillText(name.toUpperCase(), x, y + row * 44);
  });
  y += column * 44 + 40;

  ctx.fillStyle = rule;
  ctx.fillRect(margin, y, width, 3);
  y += 64;
  ctx.fillStyle = ink2;
  ctx.font = `400 32px ${mono}`;
  ctx.fillText(`CAREER CODE ${slip.code}`, margin, y);
  ctx.textAlign = "right";
  ctx.fillText(SHARE_TAG, SHARE_WIDTH - margin, y);
  ctx.textAlign = "left";
}

function toBlob(canvas) {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("no image"))), "image/png"));
}

export async function shareSlip(slip, { nav = navigator, doc = document, createCanvas = () => doc.createElement("canvas") } = {}) {
  if (doc.fonts?.load) await Promise.allSettled([doc.fonts.load('800 150px "Newsreader"'), doc.fonts.load('700 34px "Courier Prime"'), doc.fonts.load('400 42px "Barlow"')]);
  const canvas = createCanvas();
  canvas.width = SHARE_WIDTH;
  canvas.height = SHARE_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  renderSlip(ctx, slip);
  const blob = await toBlob(canvas);
  const file = new File([blob], `${slip.fileName}.png`, { type: "image/png" });
  const text = `${slip.headline}: ${slip.record}. Career code ${slip.code} ${SHARE_TAG}`;
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text, title: PRODUCT_NAME });
      return "shared";
    } catch (error) {
      if (error?.name === "AbortError") return "cancelled";
    }
  }
  const url = URL.createObjectURL(file);
  const link = doc.createElement("a");
  link.href = url;
  link.download = file.name;
  doc.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  try { await nav.clipboard?.writeText(text); } catch { /* clipboard blocked; the download still happened */ }
  return "downloaded";
}
