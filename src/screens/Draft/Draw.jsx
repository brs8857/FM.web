import { useEffect, useState } from "react";
import Button from "../../ui/Button.jsx";
import Cutting from "../../ui/Cutting.jsx";
import Ticker from "../../ui/Ticker.jsx";
import { Term } from "../../ui/Term.jsx";
import { createRng } from "../../engine/rng.js";
import { BENCH_SIZE } from "../../engine/squad.js";
import { POSITION_LABEL } from "../../content/labels.js";
import { t } from "../../content/t.js";
import styles from "./Draft.module.css";

export const SPIN_MS = 1100;
const TICK_MS = 90;

// The ticker is cosmetic; the cuttings come from the reducer.
// `benchPick` is set in the bench stage: any position, the whole squad on offer.
export default function Draw({ draw, slotType, benchPick = null, eraIndex, instant, selected, labelFor, onDraw, onLand, onRedraw, onOpen, onFill }) {
  const [tickerLines, setTickerLines] = useState([]);
  const position = slotType ? (POSITION_LABEL[slotType] ?? slotType).toLowerCase() : "";

  useEffect(() => {
    if (!draw.spinning) { setTickerLines([]); return undefined; }
    if (instant || eraIndex.length === 0) { onLand(); return undefined; }
    const rng = createRng(Date.now() >>> 0);
    const timer = setInterval(() => {
      setTickerLines((lines) => [...lines, { id: lines.length, text: rng.pick(eraIndex).label }].slice(-4));
    }, TICK_MS);
    const land = setTimeout(onLand, SPIN_MS);
    return () => { clearInterval(timer); clearTimeout(land); };
  }, [draw.spinning, instant, eraIndex, onLand]);

  const landed = draw.options.length > 0;
  const bench = benchPick !== null;
  const title = bench
    ? `${landed ? "Cuttings for" : "Drawing for"} ${t("draft.benchPick", { pick: benchPick, size: BENCH_SIZE }).toLowerCase()}`
    : landed ? `Cuttings for the ${position} slot` : `Drawing for the ${position} slot`;
  const fill = bench && !draw.spinning && <Button variant="ghost" size="sm" onClick={onFill}>Fill the bench for me</Button>;
  return (
    <section className={styles.draw} aria-label="The draw">
      <div className={styles.drawHead}>
        <span className={styles.drawTitle}>{title}</span>
        <span className={styles.ticks}>
          <Term term="redraw">{t("draft.redraws", { count: draw.redrawsLeft })}</Term>
        </span>
      </div>

      {draw.spinning && <Ticker lines={tickerLines.length ? tickerLines : ["…"]} label="Drawing" cursor maxLines={4} />}

      {!draw.spinning && !landed && (
        <div className={styles.drawEmpty}>
          {draw.lastEmpty && <p className={styles.note}>Nobody left in those squads. Draw again.</p>}
          <Button block onClick={onDraw}>Draw</Button>
          {fill}
        </div>
      )}

      {!draw.spinning && landed && (
        <>
          <ul className={styles.cuttings} aria-label="Cuttings">
            {draw.options.map((o, i) => (
              <li key={`${o.year}_${o.clubId}`}>
                <Cutting title={labelFor(o)} selected={selected === i} onOpen={() => onOpen(i)}
                  subtitle={bench ? t("draft.squadSize", { count: o.players.length }) : o.relaxed ? "Showing everyone" : t("draft.eligible", { count: o.players.length, position })}
                  note={o.relaxed ? t("draft.relaxed", { position }) : undefined} />
              </li>
            ))}
          </ul>
          <Button variant="secondary" size="sm" onClick={onRedraw} disabled={draw.redrawsLeft <= 0} aria-label={`Redraw, ${t("draft.redraws", { count: draw.redrawsLeft }).toLowerCase()}`}>
            Redraw
          </Button>
          {fill}
        </>
      )}
    </section>
  );
}
