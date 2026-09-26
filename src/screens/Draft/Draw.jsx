import { useEffect, useState } from "react";
import Button from "../../ui/Button.jsx";
import Cutting from "../../ui/Cutting.jsx";
import Ticker from "../../ui/Ticker.jsx";
import { Term } from "../../ui/Term.jsx";
import { createRng } from "../../engine/rng.js";
import { POSITION_LABEL } from "../../content/labels.js";
import { t } from "../../content/t.js";
import { cx } from "../../ui/cx.js";
import styles from "./Draft.module.css";

export const SPIN_MS = 1100;
const TICK_MS = 90;

// The ticker is cosmetic; the cuttings come from the reducer.
export default function Draw({ draw, slotType, eraIndex, instant, selected, labelFor, onDraw, onLand, onRedraw, onOpen }) {
  const [tickerLines, setTickerLines] = useState([]);
  const position = (POSITION_LABEL[slotType] ?? slotType).toLowerCase();

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
  return (
    <section className={styles.draw} aria-label="The draw">
      <div className={styles.drawHead}>
        <span className={styles.drawTitle}>{landed ? `Cuttings for the ${position} slot` : `Drawing for the ${position} slot`}</span>
        <span className={styles.ticks} aria-label={t("draft.redraws", { count: draw.redrawsLeft })}>
          {[0, 1].map((i) => <span key={i} className={cx(styles.tick, i >= draw.redrawsLeft && styles.spent)} aria-hidden="true">✓</span>)}
          <Term term="redraw" icon label="Redraws" />
        </span>
      </div>

      {draw.spinning && <Ticker lines={tickerLines.length ? tickerLines : ["…"]} label="Drawing" cursor maxLines={4} />}

      {!draw.spinning && !landed && (
        <div className={styles.drawEmpty}>
          {draw.lastEmpty && <p className={styles.note}>Nobody left in those squads. Draw again.</p>}
          <Button block onClick={onDraw}>Draw</Button>
        </div>
      )}

      {!draw.spinning && landed && (
        <>
          <ul className={styles.cuttings} aria-label="Cuttings">
            {draw.options.map((o, i) => (
              <li key={`${o.year}_${o.clubId}`}>
                <Cutting title={labelFor(o)} selected={selected === i} onOpen={() => onOpen(i)}
                  subtitle={o.relaxed ? "Showing everyone" : t("draft.eligible", { count: o.players.length, position })}
                  note={o.relaxed ? t("draft.relaxed", { position }) : undefined} />
              </li>
            ))}
          </ul>
          <Button variant="secondary" size="sm" onClick={onRedraw} disabled={draw.redrawsLeft <= 0} aria-label={`Redraw, ${t("draft.redraws", { count: draw.redrawsLeft }).toLowerCase()}`}>
            Redraw
          </Button>
        </>
      )}
    </section>
  );
}
