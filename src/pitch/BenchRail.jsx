import Marker from "./Marker.jsx";
import { POSITION_LABEL } from "../content/labels.js";
import styles from "./BenchRail.module.css";

export default function BenchRail({ bench, interactive, draggable, lifted, draggingIdx, onTap, onDragStart, onKeyDown }) {
  return (
    <div className={styles.rail} data-drop-zone="bench" role="group" aria-label="Bench">
      <span className={styles.label} aria-hidden="true">Bench</span>
      <div className={styles.markers}>
        {bench.map((b, i) => (
          <Marker key={i} kind="bench" id={i} code={b.player?.slot ?? "—"} position={b.player ? `Bench, ${POSITION_LABEL[b.player.slot] ?? b.player.slot}` : "Bench"}
            player={b.player} interactive={interactive} draggable={draggable}
            lifted={lifted?.kind === "bench" && lifted.id === i} dragging={draggingIdx === i}
            onTap={onTap} onDragStart={onDragStart} onKeyDown={onKeyDown} emptyLabel="empty" />
        ))}
      </div>
    </div>
  );
}
