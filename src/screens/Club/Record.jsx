import { useState } from "react";
import Sheet from "../../ui/Sheet.jsx";
import Table from "../../ui/Table.jsx";
import { cx } from "../../ui/cx.js";
import { careerSeasonLabel, USER_TEAM_NAME } from "../../engine/season.js";
import { tierLabel, IDENTITY_LABEL } from "../../content/labels.js";
import { t } from "../../content/t.js";
import { selectTopScorers } from "../../state/selectors.js";
import { ordinal, RESULT_TONE } from "../../content/format.js";
import MatchList from "../Season/MatchList.jsx";
import styles from "./Club.module.css";

// The biggest winning margin in the career, the more goals breaking a tie,
// then the earlier match.
export function biggestWin(history) {
  let best = null;
  for (const season of history) {
    for (const m of season.matches ?? []) {
      if (m.outcome !== "W") continue;
      const margin = m.gf - m.ga;
      if (!best || margin > best.margin || (margin === best.margin && m.gf > best.match.gf)) best = { season: season.season, match: m, margin };
    }
  }
  return best;
}

export function recordSummary(history) {
  if (history.length === 0) return null;
  const best = history.reduce((b, s) => (s.position < b.position ? s : b));
  const [topScorer] = selectTopScorers(history.flatMap((s) => s.matches ?? []), 1);
  return {
    best, titles: history.filter((s) => s.position === 1).length,
    unbeaten: history.filter((s) => s.l === 0).length, points: history.reduce((sum, s) => sum + s.pts, 0),
    topScorer: topScorer ?? null, biggestWin: biggestWin(history),
  };
}

export function winLine(win, clubName) {
  const { match } = win;
  const score = match.home ? `${USER_TEAM_NAME} ${match.gf}-${match.ga} ${clubName(match.opponent)}` : `${clubName(match.opponent)} ${match.ga}-${match.gf} ${USER_TEAM_NAME}`;
  return `${score} · ${careerSeasonLabel(win.season)}`;
}

function FormStrip({ matches }) {
  const count = (o) => matches.filter((m) => m.outcome === o).length;
  const last = matches.slice(-5).map((m) => m.outcome).join(" ");
  return (
    <p className={styles.form}>
      <span className="visually-hidden">{t("season.form", { w: count("W"), d: count("D"), l: count("L"), last })}</span>
      <span aria-hidden="true">{matches.map((m) => <span key={m.week} className={styles[RESULT_TONE[m.outcome]]}>{m.outcome}</span>)}</span>
    </p>
  );
}

// Seasons played before 2.7.0 have no match log, only the verdict.
function SeasonSheet({ season, clubName, onClose }) {
  const logged = season.matches?.length > 0;
  const scorers = logged ? selectTopScorers(season.matches, 3) : [];
  return (
    <Sheet open onClose={onClose} title={tierLabel({ name: season.tier }).name} size="lg">
      <div className={styles.section}>
        <p className={styles.kicker}>Season {season.season} · {careerSeasonLabel(season.season)}</p>
        <p className={styles.mono}>{t("season.record", season)} · {season.pts} pts · Finished {ordinal(season.position)}</p>
        {!logged && <p className={styles.empty}>{t("season.noLog")}</p>}
        {logged && (
          <>
            <h3 className={styles.subheading}>Form</h3>
            <FormStrip matches={season.matches} />
            <h3 className={styles.subheading}>Top scorers</h3>
            {scorers.length === 0 ? <p className={styles.empty}>Nobody scored.</p> : (
              <ol className={styles.scorers}>
                {scorers.map((s) => <li key={s.id ?? s.name}>{s.name} · {s.goals}</li>)}
              </ol>
            )}
            <h3 className={styles.subheading}>The matches</h3>
            <MatchList matches={season.matches} clubName={clubName} />
          </>
        )}
      </div>
    </Sheet>
  );
}

export default function Record({ history, clubName = (name) => name, complete = false }) {
  const [open, setOpen] = useState(null);
  const summary = recordSummary(history);
  if (!summary) return <p className={styles.empty}>No season in the book yet. It fills in as each one ends.</p>;
  const columns = [
    { key: "season", label: "Season", mono: true, render: (r) => (
      <button type="button" className={styles.seasonButton} aria-haspopup="dialog" onClick={() => setOpen(r.season)}>{careerSeasonLabel(r.season)}</button>
    ) },
    { key: "position", label: "Finish", mono: true, align: "right", render: (r) => ordinal(r.position) },
    { key: "pts", label: "Pts", mono: true, align: "right" },
    { key: "identity", label: "Identity", render: (r) => r.identity ?? IDENTITY_LABEL.bespoke },
    { key: "tier", label: "Verdict", render: (r) => tierLabel({ name: r.tier }).name },
  ];
  const season = history.find((s) => s.season === open);
  return (
    <div className={styles.section}>
      <div className={styles.summary}>
        <div className={styles.stat}><span className={styles.statLabel}>Best finish</span><span className={styles.statValue}>{ordinal(summary.best.position)} · {careerSeasonLabel(summary.best.season)}</span></div>
        <div className={styles.stat}><span className={styles.statLabel}>Titles</span><span className={styles.statValue}>{t("club.titles", { count: summary.titles })}</span></div>
        <div className={styles.stat}><span className={styles.statLabel}>Unbeaten seasons</span><span className={styles.statValue}>{summary.unbeaten}</span></div>
        {summary.topScorer && (
          <div className={styles.stat}><span className={styles.statLabel}>Top scorer</span><span className={styles.statValue}>{summary.topScorer.name} · {summary.topScorer.goals}</span></div>
        )}
        {summary.biggestWin && (
          <div className={styles.stat}><span className={styles.statLabel}>Biggest win</span><span className={cx(styles.statValue, styles.statSmall)}>{winLine(summary.biggestWin, clubName)}</span></div>
        )}
      </div>
      <Table caption="The record" captionHidden columns={columns} rows={history} rowKey={(r) => r.season} dense />
      {complete && (
        <ul className={styles.scorers} aria-label="Top scorer each season">
          {history.map((s) => (
            <li key={s.season}>{careerSeasonLabel(s.season)} · {s.topScorer ? `${s.topScorer.name}, ${s.topScorer.goals}` : "no match log"}</li>
          ))}
        </ul>
      )}
      {season && <SeasonSheet season={season} clubName={clubName} onClose={() => setOpen(null)} />}
    </div>
  );
}
