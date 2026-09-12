// Player rows have no stable id across seasons. The same real person is
// recognised by name + nationality + birth year (season year − age), allowing
// ±1 year because age is measured on a fixed date each season. Checked against
// the dataset: 2,493 of 2,758 multi-season players have a stable birth year,
// 244 drift by exactly 1, and the 21 that differ by 2+ are different people.
export function playerIdentity(player) {
  const seasonYear = parseInt(String(player.seasonKey).split("_")[0], 10);
  const birthYear = player.age ? seasonYear - player.age : null;
  return { name: player.name, nat: player.nat, birthYear };
}

export function isSameRealPlayer(a, b) {
  if (a.name !== b.name || a.nat !== b.nat) return false;
  if (a.birthYear == null || b.birthYear == null) return true;
  return Math.abs(a.birthYear - b.birthYear) <= 1;
}

export function isOwnedIdentity(identities, player) {
  const identity = playerIdentity(player);
  return identities.some((owned) => isSameRealPlayer(owned, identity));
}
