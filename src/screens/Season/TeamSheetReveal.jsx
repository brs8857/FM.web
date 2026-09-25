import { useEffect, useMemo, useState } from "react";
import Button from "../../ui/Button.jsx";
import Stamp from "../../ui/Stamp.jsx";
import TeamSheetRow from "../../ui/TeamSheetRow.jsx";
import { careerSeasonLabel } from "../../engine/season.js";
import { playerMeta } from "../Draft/CuttingSheet.jsx";
import styles from "./Season.module.css";

export const REVEAL_MS = 240;

// The ratings reveal (spec 04 §5.5): eleven rows print in, each overall
// stamps in, then the squad average. Instant when resumed or under reduced
// motion.
export default function TeamSheetReveal({ state, instant, onKickoff }) {
  const starters = useMemo(() => state.assignments.filter((a) => a.player).sort((a, b) => a.player.ov - b.player.ov), [state.assignments]);
  const [revealed, setRevealed] = useState(instant ? starters.length : 0);

  useEffect(() => {
    if (instant) { setRevealed(starters.length); return undefined; }
    if (revealed >= starters.length) return undefined;
    const timer = setTimeout(() => setRevealed((r) => r + 1), REVEAL_MS);
    return () => clearTimeout(timer);
  }, [revealed, starters.length, instant]);

  const done = revealed >= starters.length;
  const average = Math.round(starters.reduce((s, a) => s + a.player.ov, 0) / Math.max(1, starters.length));

  return (
    <div className={styles.stack}>
      <header>
        <h2 className={styles.heading}>Team sheet · {careerSeasonLabel(state.season)}</h2>
        <p className={styles.lede}>Hidden through the draft and the board. This is what you built.</p>
      </header>
      <ul className={styles.rows} aria-label="Ratings revealed">
        {starters.map((a, i) => (
          <TeamSheetRow key={a.slotId} code={a.type} name={a.player.name} meta={playerMeta(a.player)}
            trailing={i < revealed ? <Stamp value={a.player.ov} size="md" /> : <span className={styles.pending} aria-label="not yet revealed">··</span>} />
        ))}
      </ul>
      {done && (
        <div className={styles.average}>
          <Stamp value={average} label="Squad average" size="xl" />
          <Button block onClick={onKickoff}>Start season {state.season}</Button>
        </div>
      )}
    </div>
  );
}
