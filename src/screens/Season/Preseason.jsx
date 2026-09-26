import Button from "../../ui/Button.jsx";
import Callout from "../../ui/Callout.jsx";
import IdentityLine from "../Board/IdentityLine.jsx";
import { careerSeasonLabel } from "../../engine/season.js";
import { selectMemory, selectSettling } from "../../state/selectors.js";
import { t } from "../../content/t.js";
import styles from "./Season.module.css";

export default function Preseason({ state, identity, familiarity, tacticUntouched, clubName, onGoBoard }) {
  const promoted = new Set(state.lastTransition?.promoted ?? []);
  const retired = state.lastTransition?.retired ?? [];
  const empty = state.assignments.filter((a) => !a.player).length;
  return (
    <div className={styles.stack}>
      <div>
        <h2 className={styles.heading}>Season {state.season} · {careerSeasonLabel(state.season)}</h2>
        <p className={styles.lede}>Thirty-eight matches, home and away against nineteen rivals. The fixture list is drawn and the ratings revealed at kick-off.</p>
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
