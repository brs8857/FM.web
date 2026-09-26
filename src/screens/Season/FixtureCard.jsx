import Button from "../../ui/Button.jsx";
import Cutting from "../../ui/Cutting.jsx";
import Strengths from "../Board/Strengths.jsx";
import IdentityLine from "../Board/IdentityLine.jsx";
import { rivalStrength } from "../../engine/match.js";
import { t } from "../../content/t.js";
import { ordinal } from "../../content/format.js";
import styles from "./Season.module.css";

export function standing(fixture) {
  const parts = [];
  if (fixture.week > 1 && fixture.row) parts.push(`${ordinal(fixture.row.position)} · ${t("season.pts", { pts: fixture.row.pts })}`);
  if (fixture.promoted) parts.push("promoted");
  return parts.join(" · ") || "Opening day";
}

export default function FixtureCard({ fixture, profile, familiarity, instructions, identity, memory, settle, clubName, onGoBoard, onGoSquad }) {
  const name = clubName(fixture.name);
  return (
    <Cutting kicker={t("season.next", { week: fixture.week, venue: fixture.home ? "Home" : "Away" })} title={name} subtitle={standing(fixture)}>
      <div className={styles.fixtureBody}>
        <Strengths profile={profile} familiarity={familiarity} instructions={instructions} notes={0}
          reference={{ value: rivalStrength(fixture.opponent), label: name }} />
        <IdentityLine identity={identity} familiarity={familiarity} memory={memory} settle={settle} />
        <div className={styles.fixtureActions}>
          <Button variant="ghost" size="sm" onClick={onGoBoard}>Board</Button>
          <Button variant="ghost" size="sm" onClick={onGoSquad}>Squad</Button>
        </div>
      </div>
    </Cutting>
  );
}
