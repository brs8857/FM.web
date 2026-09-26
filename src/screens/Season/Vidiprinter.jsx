import { useEffect, useRef, useState } from "react";
import Button from "../../ui/Button.jsx";
import Slip from "../../ui/Slip.jsx";
import Ticker from "../../ui/Ticker.jsx";
import { useAnnounce } from "../../ui/LiveRegion.jsx";
import { t } from "../../content/t.js";
import { careerSeasonLabel } from "../../engine/season.js";
import styles from "./Season.module.css";

export const TICK_MS = 350;
export const HALF_SEASON = 19;
const TONE = { W: "win", D: "draw", L: "loss" };

export function ordinal(n) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

function pad(text, width) {
  return text.length >= width ? text.slice(0, width) : text + " ".repeat(width - text.length);
}

export function resultLine(match, clubName) {
  const venue = match.home ? "(H)" : "(A)";
  return { id: match.week, tone: TONE[match.outcome], text: `WK ${String(match.week).padStart(2)}  ${pad(`${clubName(match.opponent).toUpperCase()} ${venue}`, 26)} ${match.gf}-${match.ga}  ${match.outcome}` };
}

// The running position: your points so far against each rival's points
// after the same week. Only points are kept week by week, so a tie goes your
// way until the final week, where the table's goal-difference order stands.
export function runningPosition(simulation, week) {
  const played = simulation.matches.slice(0, week);
  const pts = played.reduce((sum, m) => sum + (m.outcome === "W" ? 3 : m.outcome === "D" ? 1 : 0), 0);
  const rivals = simulation.table.filter((r) => !r.isUser).map((r) => (week > 0 ? r.weekly[week - 1] : 0));
  const position = week >= simulation.matches.length ? simulation.position : 1 + rivals.filter((p) => p > pts).length;
  const w = played.filter((m) => m.outcome === "W").length, d = played.filter((m) => m.outcome === "D").length, l = played.length - w - d;
  return { pts, position, w, d, l };
}

// The vidiprinter (spec 04 §5.5): results type in, newest at the bottom, with
// a sticky position ticker; Pause and Skip; a half-season slip at week 19.
// Announcements happen only at pauses, never per tick.
export default function Vidiprinter({ simulation, season, instant, clubName, onDone }) {
  const announce = useAnnounce();
  const total = simulation.matches.length;
  const [shown, setShown] = useState(instant ? total : 0);
  const [paused, setPaused] = useState(false);
  const [halfSeen, setHalfSeen] = useState(instant);
  const doneFired = useRef(false);
  const atHalf = shown === HALF_SEASON && !halfSeen;
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

  const running = runningPosition(simulation, shown);
  const positionText = t("season.position", { week: shown, position: ordinal(running.position), pts: running.pts });
  const lines = simulation.matches.slice(0, shown).map((m) => resultLine(m, clubName));

  const speak = (why) => {
    const latest = lines[lines.length - 1];
    announce(`${why}. ${latest ? `${latest.text}. ` : ""}${positionText}.`);
  };
  const pause = () => { setPaused(true); speak("Paused"); };
  const resume = () => setPaused(false);
  const skip = () => { setShown(total); setHalfSeen(true); setPaused(false); };
  const continueHalf = () => setHalfSeen(true);

  useEffect(() => {
    if (!atHalf) return;
    const half = runningPosition(simulation, HALF_SEASON);
    announce(`Half-season. ${t("season.record", half)}. ${t("season.position", { week: HALF_SEASON, position: ordinal(half.position), pts: half.pts })}.`);
  }, [atHalf, simulation, announce]);

  return (
    <div className={styles.stack}>
      <div className={styles.positionBar}>
        <span className={styles.position}>{positionText}</span>
        {!done && (
          <span className={styles.controls}>
            {paused
              ? <Button size="sm" variant="secondary" onClick={resume}>Resume</Button>
              : <Button size="sm" variant="secondary" onClick={pause} disabled={atHalf}>Pause</Button>}
            <Button size="sm" variant="ghost" onClick={skip}>Skip to end</Button>
          </span>
        )}
      </div>
      <Ticker lines={lines.length ? lines : [{ id: 0, text: `SEASON ${season} · ${careerSeasonLabel(season).toUpperCase()} · KICK-OFF`, tone: "muted" }]}
        label="Vidiprinter" announce={false} cursor={!done} />
      {atHalf && (
        <Slip kicker="Half-season" title={`${ordinal(running.position)} at the turn`}>
          <p className={styles.mono}>{t("season.record", running)} · {t("season.position", { week: shown, position: ordinal(running.position), pts: running.pts })}</p>
          <p className={styles.lede}>A stopping point. The second half plays when you are ready.</p>
          <Button onClick={continueHalf}>Continue</Button>
        </Slip>
      )}
    </div>
  );
}
