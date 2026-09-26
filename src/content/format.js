export const RESULT_TONE = { W: "win", D: "draw", L: "loss" };
export const SIDE_LABEL = { L: "Left", R: "Right" };

export function ordinal(n) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

// A true minus sign, so "−3" lines up with "+3" in the tabular figures.
export function signed(n) {
  if (n > 0) return `+${n}`;
  return n < 0 ? `−${-n}` : "±0";
}

export function goalDifference(n) {
  return n === 0 ? "0" : signed(n);
}

export function playerMeta(player) {
  return [player.age ?? "—", player.nat, player.side ? `${SIDE_LABEL[player.side]} side` : null].filter(Boolean).join(" · ");
}
