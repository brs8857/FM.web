import Sheet from "../../ui/Sheet.jsx";
import Button from "../../ui/Button.jsx";
import { Term } from "../../ui/Term.jsx";
import { POSITION_LABEL } from "../../content/labels.js";
import { t } from "../../content/t.js";
import { playerMeta, signed, SIDE_LABEL } from "../../content/format.js";
import styles from "./Draft.module.css";

export default function ConfirmPick({ player, preview, clubSeason, onClose, onPick }) {
  const position = preview ? (POSITION_LABEL[preview.type] ?? preview.type).toLowerCase() : "";
  const effects = [];
  if (preview) {
    if (preview.first) effects.push({ text: `First pick: the squad's era starts at ${clubSeason}.`, tone: "neutral" });
    else if (preview.eraDelta < 0) effects.push({ text: t("draft.eraCost", { years: preview.spreadAfter, delta: signed(preview.eraDelta) }), tone: "cost" });
    else effects.push({ text: preview.spreadAfter === 0 ? "Same season as the rest: no era cost." : `Era spread stays at ${t("years", { count: preview.spreadAfter })}: no extra cost.`, tone: "neutral" });
    if (preview.sideMismatch) effects.push({ text: `${SIDE_LABEL[player.side]}-sided player in a ${SIDE_LABEL[preview.slotSide].toLowerCase()} slot: cohesion ${signed(preview.sideDelta)}.`, tone: "cost" });
    if (preview.offPosition) effects.push({ text: `Not a ${position}: he will play out of position.`, tone: "cost" });
  }
  return (
    <Sheet open={Boolean(player)} onClose={onClose} title={player?.name ?? ""} size="md"
      footer={<Button onClick={onPick}>Pick</Button>}>
      {player && (
        <>
          <p className={styles.identity}>{POSITION_LABEL[player.slot] ?? player.slot} · {playerMeta(player)} · {clubSeason}</p>
          <p className={styles.sheetLede}>For the {position} slot. Effect on <Term term="cohesion">cohesion</Term>:</p>
          <ul className={styles.effects}>
            {effects.map((e) => <li key={e.text} className={e.tone === "cost" ? styles.cost : undefined}>{e.text}</li>)}
          </ul>
        </>
      )}
    </Sheet>
  );
}
