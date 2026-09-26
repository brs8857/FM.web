import ClubPicker from "./ClubPicker.jsx";
import styles from "./Colours.module.css";

// New career, step 3: the favourite club whose colours theme the app. A
// per-device preference, not part of the career; Settings changes it later.
export default function Colours({ club, mode, onPick }) {
  return (
    <div className={styles.colours}>
      <h2 className={styles.heading}>Choose your colours</h2>
      <p className={styles.lede}>Pick the club you follow and its two colours become the paper, the ink and the chalkboard. Keep the pitch green if you would rather not say. You can change this any time in Settings.</p>
      <ClubPicker value={club} mode={mode} onChange={onPick} />
    </div>
  );
}
