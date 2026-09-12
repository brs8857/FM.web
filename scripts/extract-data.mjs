// One-off: moves the DATASET and CHAMPIONSHIP_POOL literals out of src/App.jsx into JSON.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const APP = "src/App.jsx";
const lines = readFileSync(APP, "utf8").replace(/\r\n/g, "\n").split("\n");

const DATA_LINE = 6;   // line 7
const POOL_LINE = 775; // line 776, followed by a lone ";" on line 777
if (!lines[DATA_LINE].startsWith("const DATASET = ")) throw new Error("line 7 is not the DATASET literal");
if (!lines[POOL_LINE].startsWith("const CHAMPIONSHIP_POOL = ")) throw new Error("line 776 is not the CHAMPIONSHIP_POOL literal");
if (lines[POOL_LINE + 1].trim() !== ";") throw new Error("line 777 is not the closing semicolon");

const players = JSON.parse(lines[DATA_LINE].slice("const DATASET = ".length).replace(/;\s*$/, ""));
const championship = JSON.parse(lines[POOL_LINE].slice("const CHAMPIONSHIP_POOL = ".length));

mkdirSync("src/data", { recursive: true });
writeFileSync("src/data/players.json", JSON.stringify(players) + "\n");
writeFileSync("src/data/championship.json", JSON.stringify(championship, null, 1) + "\n");

lines[DATA_LINE] = "let DATASET = null; // installed at startup by installDataset() — temporary until Task 11";
lines[POOL_LINE] = "let CHAMPIONSHIP_POOL = null;";
lines[POOL_LINE + 1] = "";
writeFileSync(APP, lines.join("\n"));
console.log("players.json squads:", Object.keys(players.squads).length, "| championship clubs:", championship.length);
