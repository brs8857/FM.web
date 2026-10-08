import ClubPicker from "./ClubPicker.jsx";
import styles from "./Colours.module.css";

// A per-device preference, not part of the career.
// A Championship career offers the clubs that played in it (`only`).
export default function Colours({ club, mode, onPick, only = null }) {
  return (
    <div className={styles.colours}>
      <h2 className={styles.heading}>Whose colours?</h2>
      <p className={styles.lede}>Pick the club you follow and its two colours take over the board, the buttons and every rule. Or keep the colour wheel: a colour of its own for every tab. You can change this any time in Settings.</p>
      {only && <p className={styles.lede}>These are the clubs that have played in the Championship since 2016-17.</p>}
      <ClubPicker value={club} mode={mode} onChange={onPick} only={only} />
    </div>
  );
}
