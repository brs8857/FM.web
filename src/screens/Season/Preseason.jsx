import Button from "../../ui/Button.jsx";
import Callout from "../../ui/Callout.jsx";
import IdentityLine from "../Board/IdentityLine.jsx";
import { careerSeasonLabel, seasonWeeks } from "../../engine/season.js";
import { divisionLabel } from "../../content/labels.js";
import { selectMemory, selectSettling } from "../../state/selectors.js";
import { t } from "../../content/t.js";
import styles from "./Season.module.css";

export default function Preseason({ state, identity, familiarity, tacticUntouched, clubName, onGoBoard }) {
  const promoted = new Set(state.lastTransition?.promoted ?? []);
  const retired = state.lastTransition?.retired ?? [];
  const empty = state.assignments.filter((a) => !a.player).length;
  const rivals = state.opponents.length;
  const move = state.lastTransition?.userMove;
  return (
    <div className={styles.stack}>
      <div>
        <h2 className={styles.heading}>Season {state.season} · {careerSeasonLabel(state.season)} · {divisionLabel(state.division)}</h2>
        <p className={styles.lede}>{seasonWeeks(rivals)} matches, home and away against {rivals} rivals. The fixture list is drawn and the ratings revealed at kick-off.</p>
        {move === "up" && <p className={styles.lede}>Promoted: the first season back in the top flight.</p>}
        {move === "down" && <p className={styles.lede}>Relegated: a season in the Championship to get back up.</p>}
      </div>
      {retired.length > 0 && (
        <Callout title="Retired">
          {t("season.retired", { names: retired.join(", "), count: retired.length })}
          {empty > 0 && ` ${t("season.emptySlots", { count: empty })}`}
        </Callout>
      )}
      {tacticUntouched && (
        <Callout title="Nothing on the board yet">
          Every dial is at neutral, which is no plan at all, and it costs you. Pick a style before you kick off.{" "}
          <Button variant="ghost" size="sm" onClick={onGoBoard}>Go to the board</Button>
        </Callout>
      )}
      <IdentityLine identity={identity} familiarity={familiarity} memory={selectMemory(state)} settle={selectSettling(state)} />
      <section>
        <h3 className={styles.subheading}>The opposition</h3>
        <ol className={styles.opponents}>
          {[...state.opponents].sort((a, b) => a.name.localeCompare(b.name)).map((o) => (
            <li key={o.name} className={styles.opponent}>
              <span>{clubName(o.name)}</span>
              {promoted.has(o.name) && <span className={styles.promoted}>promoted</span>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
