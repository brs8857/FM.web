import Segmented from "../../ui/Segmented.jsx";
import Toggle from "../../ui/Toggle.jsx";
import Button from "../../ui/Button.jsx";
import Disclosure from "../../ui/Disclosure.jsx";
import ClubPicker from "../NewCareer/ClubPicker.jsx";
import { clubDisplayName } from "../../content/clubTheme.js";
import { useInstallPrompt } from "../../app/useInstallPrompt.js";
import styles from "./Club.module.css";

const THEMES = [{ key: "system", label: "System" }, { key: "light", label: "Light" }, { key: "dark", label: "Dark" }];
const MOTION = [{ key: "system", label: "System" }, { key: "on", label: "Reduce" }, { key: "off", label: "Full" }];
const CLUB_NAMES = [{ key: "real", label: "Real" }, { key: "edited", label: "Edited" }];

export default function Settings({ prefs, setPrefs }) {
  const { canInstall, install, installed, iosHint } = useInstallPrompt();
  return (
    <div className={styles.settings}>
      {canInstall && (
        <div className={styles.setting}>
          <Button variant="secondary" onClick={install}>Install app</Button>
          <p className={styles.hint}>Installed apps open full screen and keep their saves outside the browser's storage limits.</p>
        </div>
      )}
      {iosHint && <p className={styles.hint}>To install on iPhone, tap Share, then Add to Home Screen. Installed apps keep saves safe from Safari's seven-day storage limit.</p>}
      {installed && <p className={styles.hint}>Installed. Saves live with the app.</p>}
      <div className={styles.setting}>
        <span className={styles.settingLabel}>Theme</span>
        <Segmented label="Theme" options={THEMES} value={prefs.theme} onChange={(theme) => setPrefs({ theme })} />
      </div>
      <Disclosure title="Colours" summary={clubDisplayName(prefs.club, prefs.clubNames) ?? "Pitch green"}>
        <div className={styles.setting}>
          <ClubPicker value={prefs.club} mode={prefs.clubNames} onChange={(club) => setPrefs({ club })} />
          <p className={styles.hint}>Your club's two colours become the paper, the ink and the chalkboard, in light and dark.</p>
        </div>
      </Disclosure>
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
