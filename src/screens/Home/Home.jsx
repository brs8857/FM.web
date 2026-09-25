import Button from "../../ui/Button.jsx";
import Slip from "../../ui/Slip.jsx";
import CoachNote from "../../app/CoachNote.jsx";
import { PRODUCT_NAME, TAGLINE } from "../../content/product.js";
import { careerSeasonLabel } from "../../engine/season.js";
import { t } from "../../content/t.js";
import styles from "./Home.module.css";

const NOTICES = {
  unavailable: "Saving isn't available in this browser. Export your career from the Club tab to keep it.",
  corrupt: "Your saved career couldn't be loaded, so a new one can start. The damaged save was kept aside.",
};

// Home (spec 04 §5.1): the resume card with the one next action, New career,
// and the settings and about links.
export default function Home({ state, next, identity, cohesion, notice, prefs, onDismissNote, onContinue, onNewCareer, onClub, onSaves, onSettings, onAbout }) {
  const inProgress = state.phase !== "formation";
  const drafting = state.phase === "draft";
  return (
    <div className={styles.home}>
      <header className={styles.masthead}>
        <span className={styles.mark} aria-hidden="true">XI</span>
        <h1 className={styles.title}>{PRODUCT_NAME}</h1>
        <p className={styles.tagline}>{TAGLINE}</p>
      </header>

      {notice && <p role="status" className={styles.notice}>{NOTICES[notice]}</p>}

      {inProgress && (
        <Slip kicker={drafting ? "Draft in progress" : t("shell.season", { season: state.season, label: careerSeasonLabel(state.season) })}
          title={drafting ? `Pick ${next.pick} of 11` : next.label} className={styles.resume}>
          {!drafting && (
            <p className={styles.line}>
              <span className={styles.chip}>{identity}</span>
              <span>Cohesion: {cohesion}</span>
            </p>
          )}
          <div className={styles.actions}>
            <Button onClick={onContinue}>{drafting ? "Continue the draft" : next.label}</Button>
            {!drafting && <Button variant="secondary" onClick={onClub}>Club</Button>}
          </div>
        </Slip>
      )}

      <Button variant={inProgress ? "secondary" : "primary"} block onClick={onNewCareer}>New career</Button>

      <CoachNote id="home" prefs={prefs} onDismiss={onDismissNote} />

      <footer className={styles.footer}>
        <Button variant="ghost" onClick={onSaves}>Saves</Button>
        <Button variant="ghost" onClick={onSettings}>Settings</Button>
        <Button variant="ghost" onClick={onAbout}>About</Button>
      </footer>
    </div>
  );
}
