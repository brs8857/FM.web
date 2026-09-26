import Sheet from "../../ui/Sheet.jsx";
import TeamSheetRow from "../../ui/TeamSheetRow.jsx";
import { POSITION_LABEL } from "../../content/labels.js";
import { t } from "../../content/t.js";
import { playerMeta } from "../../content/format.js";
import styles from "./Draft.module.css";

// Shirt order: by position code, then age. Never by rating (spec 04 §5.2).
const SHIRT_ORDER = ["GK", "FB", "CB", "DM", "CM", "WIDE", "AM", "ST"];

export function shirtOrder(players) {
  return [...players].sort((a, b) => {
    const pa = SHIRT_ORDER.indexOf(a.slot), pb = SHIRT_ORDER.indexOf(b.slot);
    if (pa !== pb) return pa - pb;
    return (a.age ?? 99) - (b.age ?? 99) || a.name.localeCompare(b.name);
  });
}

export default function CuttingSheet({ option, title, slotType, onClose, onChoose }) {
  const position = POSITION_LABEL[slotType] ?? slotType;
  return (
    <Sheet open={Boolean(option)} onClose={onClose} title={title}>
      {option && (
        <>
          <p className={styles.sheetLede}>
            {option.relaxed ? t("draft.relaxed", { position: position.toLowerCase() }) : `${t("draft.eligible", { count: option.players.length, position: position.toLowerCase() })} for this slot, in shirt order.`}
          </p>
          <ul className={styles.rows}>
            {shirtOrder(option.players).map((p) => (
              <TeamSheetRow key={p.id} code={p.slot} name={p.name} meta={playerMeta(p)} onClick={() => onChoose(p)}
                mark={p.slot !== slotType ? { label: "off", title: `Not a ${position.toLowerCase()}` } : undefined} />
            ))}
          </ul>
        </>
      )}
    </Sheet>
  );
}
