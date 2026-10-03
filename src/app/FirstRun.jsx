import Button from "../ui/Button.jsx";
import Ticker from "../ui/Ticker.jsx";
import { PRODUCT_NAME } from "../content/product.js";
import styles from "./FirstRun.module.css";

export const FIRST_RUN_NOTE = "first-run";

// The rules on one page, read once, the way a paper prints how a
// competition works: no carousel.
const RULES = [
  "Every pick is a draw of three club-seasons from the archive. Open one, read its team sheet and take a player.",
  "Ratings stay hidden until kick-off. Set the side out on the chalkboard and choose how it plays.",
  "The season is played a match at a time, with a report after each. Six seasons make a career; finish in the bottom three and you go down.",
];

export default function FirstRun({ onDone }) {
  return (
    <article className={styles.firstRun} aria-labelledby="first-run-title">
      <h1 id="first-run-title" className={styles.nameplate}>{PRODUCT_NAME}</h1>
      <p className={styles.strap}>How it works</p>
      <ol className={styles.rules}>
        {RULES.map((rule) => <li key={rule}>{rule}</li>)}
      </ol>
      <Ticker lines={[{ id: 1, text: "WK 01  EVERTON (H)     2-0  W", tone: "win" }, { id: 2, text: "WK 02  LEEDS (A)       1-1  D", tone: "draw" }]} label="Example results" />
      <Button block onClick={onDone}>Start a career</Button>
    </article>
  );
}
