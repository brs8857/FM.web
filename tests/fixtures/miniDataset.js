// Small, deterministic dataset for engine and reducer tests.
// Row layout: [name, slot, side, age, nat, ov, pace, shooting, passing, dribbling, defending, physical]
const SLOT_PLAN = [
  ["GK", ""], ["GK", ""], ["CB", ""], ["CB", ""], ["CB", ""], ["FB", "L"], ["FB", "R"], ["FB", "L"],
  ["DM", ""], ["DM", ""], ["CM", ""], ["CM", ""], ["CM", ""], ["AM", ""], ["AM", ""],
  ["WIDE", "L"], ["WIDE", "R"], ["WIDE", "L"], ["ST", ""], ["ST", ""],
];

function row(name, slot, side, age, nat, ov) {
  return [name, slot, side, age, nat, ov, ov - 2, ov - 4, ov - 1, ov - 3, ov - 5, ov - 2];
}

export function makeMiniDataset() {
  const clubs = { 1: "Alpha FC", 2: "Beta United", 3: "Gamma Town", 4: "Delta City" };
  const seasons = [["2000", "1"], ["2001", "1"], ["2000", "2"], ["2001", "2"], ["2005", "3"], ["2006", "3"], ["2010", "4"], ["2011", "4"]];
  const squads = {};
  const index = [];
  for (const [y, c] of seasons) {
    const key = `${y}_${c}`;
    squads[key] = SLOT_PLAN
      .filter(([slot]) => !(key === "2005_3" && slot === "DM"))
      .map(([slot, side], i) => row(`${clubs[c]} ${slot}${i} ${y}`, slot, side, 20 + (i % 12), "England", 60 + ((i * 7 + Number(y)) % 30)));
    index.push({ y, c, label: `${clubs[c]} ${seasonText(y)}` });
  }
  // The same real player in two seasons (born 1975).
  squads["2000_1"].push(row("Sam Twice", "ST", "", 25, "Wales", 88));
  squads["2001_1"].push(row("Sam Twice", "ST", "", 26, "Wales", 89));
  // Two different people sharing a name and nationality (born 1972 and 1985).
  squads["2000_2"].push(row("Alan Smith", "ST", "", 28, "England", 80));
  squads["2010_4"].push(row("Alan Smith", "ST", "", 25, "England", 79));

  const opponents = Array.from({ length: 19 }, (_, i) => ({
    name: `Rival ${i + 1}`, ov: 70 + i, lastSeason: "2024", histMean: 72, histStd: 3, weight: 1, vol: 8,
  }));
  const place = { name: "Placeholder FC", ov: 71, lastSeason: "2024", histMean: 72, histStd: 3, weight: 1, vol: 8 };
  const table = Array.from({ length: 24 }, (_, i) => ({
    name: `Challenger ${i + 1}`, ov: 58 + (i % 8), lastSeason: "2025", histMean: 58, histStd: 3, weight: 0.95, vol: 9,
  }));
  const reserve = Array.from({ length: 8 }, (_, i) => ({
    name: `Minnow ${i + 1}`, ov: 45 + i, lastSeason: "2022", histMean: 48, histStd: 3, weight: 0.85, vol: 10,
  }));
  // A small Championship archive: two clubs, two seasons each.
  const champClubs = { 5: "Epsilon Rovers", 6: "Zeta Athletic" };
  const championshipIndex = [];
  for (const [y, c] of [["2017", "5"], ["2018", "5"], ["2017", "6"], ["2018", "6"]]) {
    const key = `${y}_${c}`;
    squads[key] = SLOT_PLAN.map(([slot, side], i) => row(`${champClubs[c]} ${slot}${i} ${y}`, slot, side, 20 + (i % 12), "England", 50 + ((i * 5 + Number(y)) % 20)));
    championshipIndex.push({ y, c, label: `${champClubs[c]} ${seasonText(y)}` });
  }
  return {
    clubs: { ...clubs, ...champClubs }, squads, index, championshipIndex, opponents,
    premier: [...opponents, place], place: place.name,
    championship: { table, reserve, place: "Challenger 24" },
  };
}

function seasonText(y) {
  return `${y}-${String(Number(y) + 1).slice(2)}`;
}
