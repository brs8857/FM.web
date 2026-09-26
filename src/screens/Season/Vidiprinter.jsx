import { useEffect, useRef, useState } from "react";
import Button from "../../ui/Button.jsx";
import Slip from "../../ui/Slip.jsx";
import Ticker from "../../ui/Ticker.jsx";
import { useAnnounce } from "../../ui/LiveRegion.jsx";
import { t } from "../../content/t.js";
import { ordinal, RESULT_TONE } from "../../content/format.js";
import { careerSeasonLabel, HALF_SEASON } from "../../engine/season.js";
import styles from "./Season.module.css";

export const TICK_MS = 350;

function pad(text, width) {
  return text.length >= width ? text.slice(0, width) : text + " ".repeat(width - text.length);
}

export function resultLine(match, clubName) {
  const venue = match.home ? "(H)" : "(A)";
  return { id: match.week, tone: RESULT_TONE[match.outcome], text: `WK ${String(match.week).padStart(2)}  ${pad(`${clubName(match.opponent).toUpperCase()} ${venue}`, 26)} ${match.gf}-${match.ga}  ${match.outcome}` };
}

export function positionText(week, row) {
  return t("season.position", { week, position: ordinal(row.position), pts: row.pts });
}

// The results are already decided and saved when this runs; it only tells
// them. Announcements wait for a pause, never one per tick.
export default function Vidiprinter({ log, from = 1, season, instant, clubName, standingAt, onDone }) {
  const announce = useAnnounce();
  const matches = log.slice(from - 1);
  const total = matches.length;
  const [shown, setShown] = useState(instant ? total : 0);
  const [paused, setPaused] = useState(false);
  const crossesHalf = from <= HALF_SEASON && log.length > HALF_SEASON;
  const [halfSeen, setHalfSeen] = useState(instant || !crossesHalf);
  const doneFired = useRef(false);
  const week = from - 1 + shown;
  const atHalf = week === HALF_SEASON && !halfSeen;
  const done = shown >= total;

  useEffect(() => {
    if (done) {
      if (!doneFired.current) { doneFired.current = true; onDone(); }
      return undefined;
    }
    if (paused || atHalf) return undefined;
    const timer = setTimeout(() => setShown((n) => n + 1), TICK_MS);
    return () => clearTimeout(timer);
  }, [shown, paused, atHalf, done, onDone]);

  const row = week > 0 ? standingAt(week) : null;
  const barText = row ? positionText(week, row) : t("season.kickoff", { season });
  const lines = matches.slice(0, shown).map((m) => resultLine(m, clubName));

  const speak = (why) => {
    const latest = lines[lines.length - 1];
    announce(`${why}. ${latest ? `${latest.text}. ` : ""}${barText}.`);
  };
  const pause = () => { setPaused(true); speak("Paused"); };
  const resume = () => setPaused(false);
  const skip = () => { setShown(total); setHalfSeen(true); setPaused(false); };
  const continueHalf = () => setHalfSeen(true);

  useEffect(() => {
    if (!atHalf) return;
    const half = standingAt(HALF_SEASON);
    announce(`Half-season. ${t("season.record", half)}. ${positionText(HALF_SEASON, half)}.`);
  }, [atHalf, standingAt, announce]);

  return (
    <div className={styles.stack}>
      <div className={styles.positionBar}>
        <span className={styles.position}>{barText}</span>
        {!done && (
          <span className={styles.controls}>
            {paused
              ? <Button size="sm" variant="secondary" onClick={resume}>Resume</Button>
              : <Button size="sm" variant="secondary" onClick={pause} disabled={atHalf}>Pause</Button>}
            <Button size="sm" variant="ghost" onClick={skip}>Skip to end</Button>
          </span>
        )}
      </div>
      <Ticker lines={lines.length ? lines : [{ id: 0, text: `SEASON ${season} · ${careerSeasonLabel(season).toUpperCase()} · WEEK ${from}`, tone: "muted" }]}
        label="Vidiprinter" announce={false} cursor={!done} />
      {atHalf && row && (
        <Slip kicker="Half-season" title={`${ordinal(row.position)} at the turn`} animate>
          <p className={styles.mono}>{t("season.record", row)} · {positionText(week, row)}</p>
          <p className={styles.lede}>Halfway. Look over the board, or carry on.</p>
          <Button onClick={continueHalf}>Continue</Button>
        </Slip>
      )}
    </div>
  );
}
