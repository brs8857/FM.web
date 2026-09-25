import Segmented from "../../ui/Segmented.jsx";
import Toggle from "../../ui/Toggle.jsx";
import styles from "./Club.module.css";

const THEMES = [{ key: "system", label: "System" }, { key: "light", label: "Light" }, { key: "dark", label: "Dark" }];
const MOTION = [{ key: "system", label: "System" }, { key: "on", label: "Reduce" }, { key: "off", label: "Full" }];
const CLUB_NAMES = [{ key: "real", label: "Real" }, { key: "edited", label: "Edited" }];

// Per-device preferences (spec 04 §5.7).
export default function Settings({ prefs, setPrefs }) {
  return (
    <div className={styles.settings}>
      <div className={styles.setting}>
        <span className={styles.settingLabel}>Theme</span>
        <Segmented label="Theme" options={THEMES} value={prefs.theme} onChange={(theme) => setPrefs({ theme })} />
      </div>
      <div className={styles.setting}>
        <span className={styles.settingLabel}>Motion</span>
        <Segmented label="Motion" options={MOTION} value={prefs.reduceMotion} onChange={(reduceMotion) => setPrefs({ reduceMotion })} />
        <p className={styles.hint}>Reduce makes the draw, the reveal and the vidiprinter instant.</p>
      </div>
      <Toggle label="Haptics" sub="On the phone app only" checked={prefs.haptics} onChange={(haptics) => setPrefs({ haptics })} />
      <div className={styles.setting}>
        <span className={styles.settingLabel}>Club names</span>
        <Segmented label="Club names" options={CLUB_NAMES} value={prefs.clubNames} onChange={(clubNames) => setPrefs({ clubNames })} />
        <p className={styles.hint}>Edited names describe each club without using its name.</p>
      </div>
      <p className={styles.hint}>Text size follows your system or browser setting; every layout is tested at 200%.</p>
    </div>
  );
}
