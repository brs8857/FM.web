import { useEffect, useRef } from "react";
import Disclosure from "../../ui/Disclosure.jsx";
import Slip from "../../ui/Slip.jsx";
import Table from "../../ui/Table.jsx";
import { useAnnounce } from "../../ui/LiveRegion.jsx";
import Button from "../../ui/Button.jsx";
import Callout from "../../ui/Callout.jsx";
import { selectTable, selectNextFixture, selectMemory, selectSettling, selectSuspended } from "../../state/selectors.js";
import { careerSeasonLabel } from "../../engine/season.js";
import { t } from "../../content/t.js";
import FixtureCard from "./FixtureCard.jsx";
import MatchReport from "./MatchReport.jsx";
import MatchList from "./MatchList.jsx";
import { resultLine } from "./Vidiprinter.jsx";
import { goalDifference, ordinal } from "../../content/format.js";
import styles from "./Season.module.css";

const COLUMNS = [
  { key: "position", label: "#", mono: true },
  { key: "name", label: "Club" },
  { key: "played", label: "P", align: "right", mono: true, render: (r) => r.w + r.d + r.l },
  { key: "gd", label: "GD", align: "right", mono: true, render: (r) => goalDifference(r.gd) },
  { key: "pts", label: "Pts", align: "right", mono: true },
];

export function afterLine(week, row) {
  return t("season.after", { week, position: ordinal(row.position), pts: row.pts });
}

export default function MatchDay({ state, identity, familiarity, profile, clubName, onGoTab }) {
  const announce = useAnnounce();
  const { campaign } = state;
  const table = selectTable(state);
  const you = table.find((r) => r.isUser);
  const last = campaign.log.at(-1);
  const fixture = selectNextFixture(state);
  const played = campaign.log.length;
  const bar = played === 0 ? t("season.barStart") : t("season.bar", { week: campaign.week, position: ordinal(you.position), pts: you.pts });
  const suspended = selectSuspended(state);
  const seen = useRef(played);

  useEffect(() => {
    if (seen.current === played || !last) return;
    seen.current = played;
    announce(`${resultLine(last, clubName).text}. ${afterLine(last.week, you)}.`);
  }, [played, last, you, clubName, announce]);

  const rows = table.map((r) => ({ ...r, name: r.isUser ? r.name : clubName(r.name) }));
  return (
    <div className={styles.matchday}>
      <div className={styles.positionBar}>
        <span className={styles.position}>{bar}</span>
      </div>
      {suspended.length > 0 && (
        <Callout title="Suspended">
          {suspended.map((s) => s.name).join(" and ")} {suspended.length === 1 ? "is" : "are"} banned for this match. Swap {suspended.length === 1 ? "him" : "them"} out before you play.{" "}
          <Button variant="ghost" size="sm" onClick={() => onGoTab("squad")}>Go to the squad</Button>
        </Callout>
      )}
      <div className={styles.matchdayGrid}>
        {last && (
          <Slip key={last.week} title="Last match">
            <MatchReport match={last} clubName={clubName} after={afterLine(last.week, you)} />
          </Slip>
        )}
        {fixture && (
          <FixtureCard fixture={fixture} profile={profile} familiarity={familiarity} instructions={state.instructions} identity={identity}
            memory={selectMemory(state)} settle={selectSettling(state)} clubName={clubName}
            onGoBoard={() => onGoTab("board")} onGoSquad={() => onGoTab("squad")} />
        )}
        <div className={styles.stack}>
          <Disclosure title="Season so far" summary={played === 0 ? "Nothing played yet" : `${t("season.record", you)} · ${t("season.pts", { pts: you.pts })}`}>
            <div className={styles.stack}>
              {played > 0 && <MatchList matches={campaign.log} clubName={clubName} />}
              <Table caption={`Table after week ${played} · ${careerSeasonLabel(state.season)}`} columns={COLUMNS} rows={rows} rowKey={(r) => r.name} isHighlighted={(r) => r.isUser} dense />
            </div>
          </Disclosure>
        </div>
      </div>
    </div>
  );
}
