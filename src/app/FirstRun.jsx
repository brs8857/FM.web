import { useState } from "react";
import Button from "../ui/Button.jsx";
import Cutting from "../ui/Cutting.jsx";
import Ticker from "../ui/Ticker.jsx";
import Marker from "../pitch/Marker.jsx";
import { PRODUCT_NAME } from "../content/product.js";
import { cx } from "../ui/cx.js";
import styles from "./FirstRun.module.css";

export const FIRST_RUN_NOTE = "first-run";

const SLIPS = [
  {
    key: "cutting", text: "Every pick is a draw of three club-seasons from the archive. You take one player from one of them.",
    visual: <Cutting title="Leeds United 2000-01" subtitle="2 centre-backs" />,
  },
  {
    key: "marker", text: "Ratings stay hidden until kick-off. Your board is chalk on slate: drag anyone anywhere.",
    visual: (
      <div className={styles.board}>
        <Marker kind="slot" id="CB1" code="CB" position="Centre-back" player={{ name: "Tony Adams" }} x={50} y={50} interactive={false} />
      </div>
    ),
  },
  {
    key: "ticker", text: "The season plays one match at a time, with a report after each; the back page gives its verdict. Six seasons make a career.",
    visual: <Ticker lines={[{ id: 1, text: "WK 01  EVERTON (H)     2-0  W", tone: "win" }, { id: 2, text: "WK 02  LEEDS (A)       1-1  D", tone: "draw" }]} label="Example results" />,
  },
];

export default function FirstRun({ onDone }) {
  const [step, setStep] = useState(0);
  const last = step === SLIPS.length - 1;
  const slip = SLIPS[step];
  return (
    <div className={styles.firstRun}>
      <p className={styles.kicker}>{PRODUCT_NAME}</p>
      <section key={slip.key} className={cx(styles.slip, "slip")} aria-live="polite" aria-label={`${step + 1} of ${SLIPS.length}`}>
        <div className={styles.visual}>{slip.visual}</div>
        <p className={styles.text}>{slip.text}</p>
      </section>
      <div className={styles.dots} aria-hidden="true">
        {SLIPS.map((s, i) => <span key={s.key} className={cx(styles.dot, i === step && styles.current)} />)}
      </div>
      <div className={styles.actions}>
        {!last && <Button variant="ghost" onClick={onDone}>Skip</Button>}
        <Button onClick={last ? onDone : () => setStep(step + 1)}>{last ? "Start a career" : "Next"}</Button>
      </div>
    </div>
  );
}
