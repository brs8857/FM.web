import { FORMATIONS } from "../engine/formations.js";

// A career code is the seed plus the era and shape, so two people who share
// one start the same draft: 32 bits of seed, 6 + 6 of era offsets from 1992,
// 3 of formation, 3 of version, then a 10-bit check, in Crockford base 32 as
// six groups of two ("7Q-K2-…"). O reads as 0 and I/L as 1 when typed.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const FORMATION_KEYS = Object.keys(FORMATIONS);
const ERA_BASE = 1992;
const VERSION = 0n;
const DATA_CHARS = 10;

function checksum(values) {
  return values.reduce((sum, v, i) => (sum + v * (i + 1)) % 1024, 0);
}

export function encodeCareerCode({ seed, eraMin, eraMax, formationKey }) {
  const f = Math.max(0, FORMATION_KEYS.indexOf(formationKey));
  let bits = (BigInt(seed >>> 0) << 18n) | (BigInt(eraMin - ERA_BASE) << 12n) | (BigInt(eraMax - ERA_BASE) << 6n) | (BigInt(f) << 3n) | VERSION;
  const values = [];
  for (let i = 0; i < DATA_CHARS; i++) { values.unshift(Number(bits & 31n)); bits >>= 5n; }
  const check = checksum(values);
  values.push(check >> 5, check & 31);
  const chars = values.map((v) => ALPHABET[v]).join("");
  return chars.match(/.{2}/g).join("-");
}

export function normalizeCareerCode(text) {
  return String(text).toUpperCase().replace(/[^0-9A-Z]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
}

export function decodeCareerCode(text) {
  const chars = normalizeCareerCode(text);
  if (chars.length !== DATA_CHARS + 2) return null;
  const values = [...chars].map((c) => ALPHABET.indexOf(c));
  if (values.some((v) => v < 0)) return null;
  const data = values.slice(0, DATA_CHARS);
  if (checksum(data) !== (values[10] << 5 | values[11])) return null;
  let bits = 0n;
  for (const v of data) bits = (bits << 5n) | BigInt(v);
  if ((bits & 7n) !== VERSION) return null;
  const formationKey = FORMATION_KEYS[Number((bits >> 3n) & 7n)];
  const eraMax = ERA_BASE + Number((bits >> 6n) & 63n);
  const eraMin = ERA_BASE + Number((bits >> 12n) & 63n);
  const seed = Number(bits >> 18n);
  if (!formationKey || eraMin > eraMax) return null;
  return { seed, eraMin, eraMax, formationKey };
}
