import { useCallback, useState } from "react";

// Keyboard model for the chalkboard (spec 04 §8.3): Tab to a marker, Enter
// picks it up, arrows nudge it 2 units (Shift: 6) through MOVE_PLAYER, Enter
// on another marker swaps, Escape cancels, E opens the player sheet.
export const NUDGE = 2;
export const NUDGE_SHIFT = 6;
const ARROWS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };

export function usePitchKeyboard({ assignments, bench = [], dispatch, onOpenSheet, announce = () => {} }) {
  const [selected, setSelected] = useState(null); // { kind: "slot" | "bench", id }

  const cancel = useCallback(() => setSelected(null), []);

  const onKeyDown = useCallback((event, kind, id) => {
    const { key } = event;
    const entryOf = (k, i) => (k === "slot" ? assignments.find((a) => a.slotId === i) : bench[i]);
    const nameOf = (k, i) => entryOf(k, i)?.player?.name ?? null;

    if (key === "Escape") {
      if (!selected) return;
      event.preventDefault();
      setSelected(null);
      announce("Selection cancelled.");
      return;
    }
    if (key === "e" || key === "E") {
      if (!nameOf(kind, id)) return;
      event.preventDefault();
      onOpenSheet?.(kind, id);
      return;
    }
    if (key === "Enter" || key === " ") {
      event.preventDefault();
      const name = nameOf(kind, id);
      if (!selected) {
        if (!name) return;
        setSelected({ kind, id });
        announce(`${name} selected. Arrow keys move, Enter on another player swaps, Escape cancels.`);
        return;
      }
      if (selected.kind === kind && selected.id === id) {
        setSelected(null);
        announce(`${name} deselected.`);
        return;
      }
      const from = nameOf(selected.kind, selected.id);
      dispatch({ type: "SWAP_PLAYERS", fromKind: selected.kind, fromId: selected.id, toKind: kind, toId: id });
      setSelected(null);
      announce(name ? `${from} and ${name} swapped.` : `${from} moved to ${kind === "bench" ? "the bench" : id}.`);
      return;
    }
    const arrow = ARROWS[key];
    if (arrow && selected && kind === "slot" && selected.kind === "slot" && selected.id === id) {
      event.preventDefault();
      const step = event.shiftKey ? NUDGE_SHIFT : NUDGE;
      const a = entryOf("slot", id);
      dispatch({ type: "MOVE_PLAYER", slotId: id, x: a.pos.x + arrow[0] * step, y: a.pos.y + arrow[1] * step });
    }
  }, [assignments, bench, dispatch, onOpenSheet, announce, selected]);

  return { selected, onKeyDown, cancel };
}
