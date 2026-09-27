import Slip from "../../ui/Slip.jsx";
import { USER_TEAM, USER_TEAM_NAME } from "../../engine/season.js";
import { selectPlayoffFixture } from "../../state/selectors.js";
import MatchReport from "./MatchReport.jsx";
import styles from "./Season.module.css";

const name = (n, clubName) => (n === USER_TEAM ? USER_TEAM_NAME : clubName(n));

// "Your XI 2-1 Coventry City" with the home side first.
function scoreLine(match, clubName) {
  return match.home
    ? `${USER_TEAM_NAME} ${match.gf}-${match.ga} ${clubName(match.opponent)}`
    : `${clubName(match.opponent)} ${match.ga}-${match.gf} ${USER_TEAM_NAME}`;
}

function rivalLine(leg, clubName) {
  return `${clubName(leg.home)} ${leg.hg}-${leg.ag} ${clubName(leg.away)}`;
}

const extraTime = (result) => (result ? ` after extra time and penalties, ${result === "won" ? "won" : "lost"}` : "");

// The play-offs as they stand: your semi-final leg by leg, the other
// semi-final, and the final. Only shown for a 3rd-6th Championship finish.
export default function Playoffs({ state, clubName }) {
  const po = state.playoffs;
  if (!po) return null;
  const { semi, other } = po;
  const next = selectPlayoffFixture(state);
  const last = po.final?.match ?? semi.legs.at(-1) ?? null;
  const legLabel = ["First leg", "Second leg"];
  // The other tie is told no further than yours: a leg for each of yours.
  const otherLegs = po.stage === "semi1" ? 0 : po.stage === "semi2" ? 1 : 2;
  return (
    <section aria-labelledby="playoffs-heading" className={styles.stack}>
      <h3 id="playoffs-heading" className={styles.subheading}>The play-offs</h3>
      <ol className={styles.ties}>
        <li className={styles.tie}>
          <span className={styles.round}>Semi-final · {USER_TEAM_NAME} v {clubName(semi.opponent)}</span>
          {semi.legs.map((m, i) => <span key={m.round} className={styles.mono}>{legLabel[i]}: {scoreLine(m, clubName)}</span>)}
          {semi.aggregate && <span className={styles.mono}>Aggregate {semi.aggregate[0]}-{semi.aggregate[1]}{extraTime(semi.extraTime)}</span>}
        </li>
        <li className={styles.tie}>
          <span className={styles.round}>Semi-final · {clubName(other.legs[1].home)} v {clubName(other.legs[1].away)}</span>
          {otherLegs === 0 && <span className={styles.note}>Played alongside yours, leg for leg.</span>}
          {other.legs.slice(0, otherLegs).map((leg, i) => <span key={i} className={styles.mono}>{legLabel[i]}: {rivalLine(leg, clubName)}</span>)}
          {otherLegs === 2 && <span className={styles.mono}>{clubName(other.winner)} go through</span>}
        </li>
        <li className={styles.tie}>
          <span className={styles.round}>Final</span>
          {po.final?.match && <span className={styles.mono}>{scoreLine(po.final.match, clubName)}{extraTime(po.final.match.extraTime)}</span>}
          {po.rivalFinal && <span className={styles.mono}>{rivalLine(po.rivalFinal, clubName)}</span>}
          {po.final && !po.final.match && <span className={styles.note}>{USER_TEAM_NAME} v {clubName(po.final.opponent)}, at a neutral ground.</span>}
          {!po.final && !po.rivalFinal && <span className={styles.note}>The two winners meet at a neutral ground.</span>}
          {po.stage === "done" && <span className={styles.round}>{name(po.winner, clubName)} {po.winner === USER_TEAM ? "go" : "goes"} up</span>}
        </li>
      </ol>
      {next && <p className={styles.lede}>Next: {next.roundLabel}, {next.venue === "N" ? "at a neutral ground" : next.home ? "at home" : "away"}.</p>}
      {last && (
        <Slip key={last.round} title="Last match" animate>
          <MatchReport match={last} clubName={clubName} />
        </Slip>
      )}
    </section>
  );
}
