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
  const championship = Array.from({ length: 24 }, (_, i) => ({
    name: `Challenger ${i + 1}`, ov: 65 + (i % 8), histMean: 66, histStd: 3, weight: 0.95, vol: 9,
  }));
  return { clubs, squads, index, opponents, championship };
}

function seasonText(y) {
  return `${y}-${String(Number(y) + 1).slice(2)}`;
}
