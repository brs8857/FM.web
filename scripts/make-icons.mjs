// Generates the app icons from the XI mark (spec 04 §3.5): a condensed XI
// with one chalk underline on slate. Drawn geometrically and rasterised
// here so the icons need no browser or image library; run `npm run icons`.
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";

const SLATE = [0x1d, 0x3a, 0x2c];
const CHALK = [0xf3, 0xf2, 0xea];
const OUT = "public/icons";

// The mark on a 0–1 square: segments as [x1, y1, x2, y2, halfWidth].
function mark(inset) {
  const s = 1 - inset * 2, o = inset;
  const w = 0.075 * s;
  const top = o + 0.22 * s, bottom = o + 0.66 * s;
  const xl = o + 0.16 * s, xr = o + 0.50 * s;
  const ix = o + 0.72 * s;
  return [
    [xl, top, xr, bottom, w], [xr, top, xl, bottom, w],
    [ix, top, ix, bottom, w],
    [xl - w, o + 0.79 * s, ix + w, o + 0.79 * s, w * 0.55],
  ];
}

function distance(px, py, [x1, y1, x2, y2]) {
  const dx = x2 - x1, dy = y2 - y1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function raster(size, inset, rounded) {
  const segments = mark(inset);
  const pixels = Buffer.alloc(size * size * 4);
  const radius = rounded ? size * 0.2 : 0;
  const sub = 4;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let cover = 0, inside = 0;
      for (let sy = 0; sy < sub; sy++) {
        for (let sx = 0; sx < sub; sx++) {
          const px = (x + (sx + 0.5) / sub) / size, py = (y + (sy + 0.5) / sub) / size;
          const cx = Math.max(radius, Math.min(size - radius, px * size)), cy = Math.max(radius, Math.min(size - radius, py * size));
          const inShape = !rounded || Math.hypot(px * size - cx, py * size - cy) <= radius;
          if (!inShape) continue;
          inside++;
          if (segments.some((seg) => distance(px, py, seg) <= seg[4])) cover++;
        }
      }
      const alpha = inside / (sub * sub), ink = inside ? cover / inside : 0;
      const i = (y * size + x) * 4;
      for (let c = 0; c < 3; c++) pixels[i + c] = Math.round(SLATE[c] + (CHALK[c] - SLATE[c]) * ink);
      pixels[i + 3] = Math.round(alpha * 255);
    }
  }
  return pixels;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

export function encodePng(size, pixels) {
  const rows = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    rows[y * (size * 4 + 1)] = 0;
    pixels.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; header[9] = 6; header[10] = 0; header[11] = 0; header[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header), chunk("IDAT", deflateSync(rows, { level: 9 })), chunk("IEND", Buffer.alloc(0)),
  ]);
}

export function svgMark() {
  const segments = mark(0.06);
  const lines = segments.map(([x1, y1, x2, y2, w]) => `<line x1="${x1 * 100}" y1="${y1 * 100}" x2="${x2 * 100}" y2="${y2 * 100}" stroke-width="${w * 200}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="#1D3A2C"/><g stroke="#F3F2EA" stroke-linecap="round">${lines}</g></svg>\n`;
}

const ICONS = [
  ["icon-192.png", 192, 0.06, true], ["icon-512.png", 512, 0.06, true],
  ["icon-maskable-512.png", 512, 0.16, false], ["apple-touch-icon.png", 180, 0.06, false],
];

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) {
  mkdirSync(OUT, { recursive: true });
  for (const [name, size, inset, rounded] of ICONS) writeFileSync(`${OUT}/${name}`, encodePng(size, raster(size, inset, rounded)));
  writeFileSync("public/icon.svg", svgMark());
  console.log(`wrote ${ICONS.length} icons and public/icon.svg`);
}
