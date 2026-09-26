import { useId } from "react";
import { Term } from "../../ui/Term.jsx";
import { cx } from "../../ui/cx.js";
import { CONCEPT, IDENTITY_LABEL, cohesionLabel, mentalityLabel } from "../../content/labels.js";
import { USER_TEAM_NAME } from "../../engine/season.js";
import { t } from "../../content/t.js";
import styles from "./MatchReport.module.css";

const TONE = { W: "win", D: "draw", L: "loss" };

export function minuteLabel(minute) {
  return minute > 90 ? `90+${minute - 90}'` : `${minute}'`;
}

export function signed(n) {
  if (n > 0) return `+${n}`;
  return n < 0 ? `−${-n}` : "±0";
}

// "Booked: Vieira 44', Keown 71'. Sent off: —"
export function cardsLine(cards) {
  const list = (kind) => cards.filter((c) => c.kind === kind).map((c) => `${c.name} ${minuteLabel(c.minute)}`).join(", ") || "—";
  return `Booked: ${list("yellow")}. Sent off: ${list("red")}.`;
}

export function identityName(key) {
  return IDENTITY_LABEL[key] ?? key;
}

// One side's goals as a timeline: the minute is the term, who scored the
// definition. The opponent's scorers are not named (spec 07 M4), so their
// definition is the club, read out but not printed.
function Scorers({ side, goals, name, us }) {
  if (goals.length === 0) {
    return <p className={styles.none}><span className="visually-hidden">{side}: no goals</span><span aria-hidden="true">—</span></p>;
  }
  return (
    <div>
      <p className="visually-hidden">{side} goals</p>
      <dl className={styles.scorers}>
        {goals.map((g) => (
          <div key={g.minute} className={styles.goal}>
            <dt className={styles.minute}>{minuteLabel(g.minute)}</dt>
            <dd className={us ? styles.scorer : "visually-hidden"}>{us ? g.name : name}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// The match report (spec 07 §6): the score with the home side first, who
// scored and when, the line the board played, and where it left the table.
// `after` is the table line; `compact` drops the kicker for rows in a list.
export default function MatchReport({ match, clubName, after, compact = false, level = 3 }) {
  const id = useId();
  const Heading = `h${level}`;
  const opponent = clubName(match.opponent);
  const ours = { name: USER_TEAM_NAME, score: match.gf, goals: match.goals.filter((g) => g.us), us: true };
  const theirs = { name: opponent, score: match.ga, goals: match.goals.filter((g) => !g.us), us: false };
  const [home, away] = match.home ? [ours, theirs] : [theirs, ours];
  const { played } = match;
  return (
    <article className={cx(styles.report, compact && styles.compact)} aria-labelledby={id}>
      {!compact && <p className={styles.kicker}>Week {match.week} · {match.home ? "Home" : "Away"}</p>}
      <Heading id={id} className={cx(styles.score, styles[TONE[match.outcome]])}>
        {home.name} {home.score} — {away.score} {away.name}
      </Heading>
      <div className={styles.columns}>
        <Scorers side={home.name} goals={home.goals} name={home.name} us={home.us} />
        <Scorers side={away.name} goals={away.goals} name={away.name} us={away.us} />
      </div>
      {played && (
        <dl className={styles.played}>
          <div><dt><Term term="identity">{CONCEPT.style}</Term></dt><dd className={styles.chip}>{identityName(played.identity)}</dd></div>
          <div><dt><Term term="cohesion">{CONCEPT.familiarity}</Term></dt><dd>{cohesionLabel(played.cohesion)} · {signed(played.settle)}</dd></div>
          <div><dt><Term term="mentality">Mentality</Term></dt><dd>{mentalityLabel(played.mentality)}</dd></div>
          {played.changed && <div className={styles.changed}><dt className="visually-hidden">System</dt><dd>Changed this week</dd></div>}
        </dl>
      )}
      {match.cards && <p className={styles.cards}>{cardsLine(match.cards)}</p>}
      {match.bans?.map((name) => <p key={name} className={styles.ban}>{t("season.misses", { name })}</p>)}
      {after && <p className={styles.table}>{after}</p>}
    </article>
  );
}
