import { useCallback } from "react";

// Arrow-key movement for radiogroups and tablists: moves the selection and the
// focus together, wrapping at the ends. Home/End jump to the first/last item.
export function useRovingKeys({ count, index, onMove, selector, orientation = "both" }) {
  return useCallback((event) => {
    if (count === 0) return;
    const horizontal = orientation !== "vertical";
    const vertical = orientation !== "horizontal";
    let next = null;
    if ((horizontal && event.key === "ArrowRight") || (vertical && event.key === "ArrowDown")) next = (index + 1) % count;
    else if ((horizontal && event.key === "ArrowLeft") || (vertical && event.key === "ArrowUp")) next = (index - 1 + count) % count;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = count - 1;
    if (next === null) return;
    event.preventDefault();
    onMove(next);
    event.currentTarget.querySelectorAll(selector)[next]?.focus();
  }, [count, index, onMove, selector, orientation]);
}
