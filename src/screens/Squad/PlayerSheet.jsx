import { useEffect, useState } from "react";
import Sheet from "../../ui/Sheet.jsx";
import Button from "../../ui/Button.jsx";
import ChipRow from "../../ui/ChipRow.jsx";
import Segmented from "../../ui/Segmented.jsx";
import Dial from "../../ui/Dial.jsx";
import Stamp from "../../ui/Stamp.jsx";
import TeamSheetRow from "../../ui/TeamSheetRow.jsx";
import { Term } from "../../ui/Term.jsx";
import { useAnnounce } from "../../ui/LiveRegion.jsx";
import StatPip from "./StatPip.jsx";
import { ROLES, DUTY_INFO } from "../../engine/roles.js";
import { STAT_KEYS, STAT_LABELS } from "../../engine/players.js";
import { POSITION_LABEL, BRIEF_LABEL, CONCEPT, roleLabel, briefLabel } from "../../content/labels.js";
import { playerMeta } from "../Draft/CuttingSheet.jsx";
import { isBanned } from "../../state/selectors.js";
import styles from "./PlayerSheet.module.css";

export const BAN_MARK = { label: "ban", title: "Suspended for the next match" };

export function entryFor(state, target) {
  if (!target) return null;
  return target.kind === "slot" ? state.assignments.find((a) => a.slotId === target.id) : state.bench[target.id];
}

// The player sheet (spec 04 §5.3): identity, five-band stats, job, brief, the
// two personal dials, and Swap with…. `revealed` shows the overall once the
// season has kicked off.
export default function PlayerSheet({ target, state, dispatch, clubSeason, revealed = false, editable = true, onClose }) {
  const announce = useAnnounce();
  const [swapping, setSwapping] = useState(false);
  const entry = entryFor(state, target);
  const player = entry?.player ?? null;
  useEffect(() => { setSwapping(false); }, [target]);
  if (!player) return <Sheet open={false} onClose={onClose} title="" />;

  const isSlot = target.kind === "slot";
  const role = isSlot ? ROLES[entry.type].find((r) => r.key === entry.role) ?? ROLES[entry.type][0] : null;
  const position = isSlot ? POSITION_LABEL[entry.type] : `Bench · ${POSITION_LABEL[player.slot] ?? player.slot}`;
  const offPosition = isSlot && player.slot !== entry.type;
  const others = [
    ...state.assignments.filter((a) => a.player && !(isSlot && a.slotId === target.id)).map((a) => ({ kind: "slot", id: a.slotId, code: a.type, player: a.player })),
    ...state.bench.map((b, i) => ({ kind: "bench", id: i, code: b.player?.slot ?? "—", player: b.player })).filter((b) => b.player && !(!isSlot && b.id === target.id)),
  ];
  const swap = (to) => {
    dispatch({ type: "SWAP_PLAYERS", fromKind: target.kind, fromId: target.id, toKind: to.kind, toId: to.id });
    announce(`${player.name} and ${to.player.name} swapped.`);
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title={player.name} size="md"
      footer={editable && !swapping ? <Button variant="secondary" onClick={() => setSwapping(true)}>Swap with…</Button> : undefined}>
      <p className={styles.identity}>
        {position}{offPosition && ` (a ${POSITION_LABEL[player.slot]?.toLowerCase() ?? player.slot} by trade)`} · {playerMeta(player)} · {clubSeason(player.seasonKey)}
      </p>
      {revealed && <div className={styles.overall}><Stamp value={player.ov} label="Overall" /></div>}
      <div className={styles.stats}>
        {STAT_KEYS.map((k) => <StatPip key={k} label={STAT_LABELS[k]} value={player.stats[k]} />)}
      </div>

      {swapping ? (
        <section className={styles.section} aria-label="Swap with">
          <h3 className={styles.subheading}>Swap with…</h3>
          <ul className={styles.rows}>
            {others.map((o) => <TeamSheetRow key={`${o.kind}-${o.id}`} code={o.code} name={o.player.name} meta={playerMeta(o.player)}
              mark={isBanned(state, o.player) ? BAN_MARK : undefined} onClick={() => swap(o)} />)}
          </ul>
          <Button variant="ghost" onClick={() => setSwapping(false)}>Cancel</Button>
        </section>
      ) : isSlot && editable ? (
        <>
          <section className={styles.section}>
            <h3 className={styles.subheading}><Term term="job">{CONCEPT.role}</Term></h3>
            <ChipRow label={CONCEPT.role} value={role.key} options={ROLES[entry.type].map((r) => ({ key: r.key, label: r.label }))}
              onChange={(roleKey) => dispatch({ type: "SET_ROLE", slotId: entry.slotId, roleKey })} />
            <p className={styles.desc}>{role.desc}</p>
          </section>
          <section className={styles.section}>
            <h3 className={styles.subheading}><Term term="brief">{CONCEPT.duty}</Term></h3>
            <Segmented label={CONCEPT.duty} value={entry.duty} options={role.duties.map((d) => ({ key: d, label: BRIEF_LABEL[d] }))}
              onChange={(duty) => dispatch({ type: "SET_DUTY", slotId: entry.slotId, duty })} />
            <p className={styles.desc}>{DUTY_INFO[entry.duty]?.desc}</p>
          </section>
          <section className={styles.section}>
            <Dial label="Attacking freedom" value={entry.sliderAtt} leftLabel="Disciplined" rightLabel="Free roam" term="attacking-freedom"
              onChange={(value) => dispatch({ type: "SET_SLIDER", slotId: entry.slotId, key: "sliderAtt", value })} />
            <Dial label="Defensive discipline" value={entry.sliderDef} leftLabel="Relaxed" rightLabel="Strict" term="defensive-discipline"
              onChange={(value) => dispatch({ type: "SET_SLIDER", slotId: entry.slotId, key: "sliderDef", value })} />
          </section>
        </>
      ) : isSlot ? (
        <p className={styles.desc}>{roleLabel(entry.type, entry.role)} · {briefLabel(entry.duty)}</p>
      ) : (
        <p className={styles.desc}>On the bench: no job until he starts.</p>
      )}
    </Sheet>
  );
}
