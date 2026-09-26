import Button from "../../ui/Button.jsx";
import Disclosure from "../../ui/Disclosure.jsx";
import Slip from "../../ui/Slip.jsx";
import CoachNote from "../../app/CoachNote.jsx";
import Record from "./Record.jsx";
import CareerCode from "./CareerCode.jsx";
import Saves from "./Saves.jsx";
import Settings from "./Settings.jsx";
import About from "./About.jsx";
import { careerSeasonLabel, CAREER_SEASONS } from "../../engine/season.js";
import { clubName as displayClubName } from "../../content/clubs.js";
import styles from "./Club.module.css";

// The Club tab (spec 04 §5.7): the record, the career code, saves,
// settings, about. A complete career shows the record as a slip.
export default function ClubTab({ history, careerComplete, careerCode, prefs, setPrefs, onDismissNote, canExport, storageAvailable, onExport, onImportFile, onStartFromCode, onNewCareer }) {
  const clubName = (name) => displayClubName(name, prefs.clubNames);
  return (
    <div className={styles.club}>
      <CoachNote id="club" prefs={prefs} onDismiss={onDismissNote} />
      {careerComplete ? (
        <Slip kicker="Career complete" title={`${careerSeasonLabel(1)} to ${careerSeasonLabel(CAREER_SEASONS)}`}>
          <p className={styles.hint}>Six seasons with this XI. The record stands; the next one starts from a blank sheet.</p>
          <Record history={history} clubName={clubName} complete />
          <div className={styles.row}><Button onClick={onNewCareer}>Start a new career</Button></div>
        </Slip>
      ) : (
        <section className={styles.section}>
          <h2 className={styles.subheading}>The record</h2>
          <Record history={history} clubName={clubName} />
        </section>
      )}
      <section className={styles.section}>
        <h2 className={styles.subheading}>Career code</h2>
        <CareerCode code={careerCode} onStartFromCode={onStartFromCode} />
      </section>
      <Disclosure title="Saves">
        <Saves canExport={canExport} storageAvailable={storageAvailable} onExport={onExport} onImportFile={onImportFile} />
      </Disclosure>
      <Disclosure title="Settings">
        <Settings prefs={prefs} setPrefs={setPrefs} />
      </Disclosure>
      <Disclosure title="About">
        <About />
      </Disclosure>
    </div>
  );
}
