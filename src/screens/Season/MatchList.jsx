import { useId, useState } from "react";
import { ChevronIcon } from "../../ui/icons.jsx";
import { cx } from "../../ui/cx.js";
import MatchReport from "./MatchReport.jsx";
import { resultLine } from "./Vidiprinter.jsx";
import styles from "./MatchList.module.css";

// A result as the teleprinter prints it, in columns that fit a phone: the
// club's name gives way before the score does.
function Cells({ match, clubName }) {
  return (
    <>
      <span>WK {String(match.week).padStart(2, "\u2007")}</span>
      <span className={styles.club}>{clubName(match.opponent)} ({match.home ? "H" : "A"})</span>
      <span>{match.gf}-{match.ga}</span>
      <span>{match.outcome}</span>
    </>
  );
}

function Row({ match, clubName }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const { tone } = resultLine(match, clubName);
  if (!Array.isArray(match.goals)) return <li className={cx(styles.line, styles[tone])}><Cells match={match} clubName={clubName} /></li>;
  return (
    <li>
      <button type="button" className={cx(styles.line, styles.toggle, styles[tone])} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        <Cells match={match} clubName={clubName} />
        <ChevronIcon open={open} />
      </button>
      <div id={id} hidden={!open} className={styles.panel}>
        {open && <MatchReport match={match} clubName={clubName} compact level={4} />}
      </div>
    </li>
  );
}

// The results in teleprinter lines, each opening its match report. Results
// recorded before the match log existed have no report and stay plain lines.
export default function MatchList({ matches, clubName, label = "Results" }) {
  return (
    <ol className={styles.list} aria-label={label}>
      {matches.map((m) => <Row key={m.week} match={m} clubName={clubName} />)}
    </ol>
  );
}
