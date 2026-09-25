import { useEffect } from "react";
import { TAB_KEYS } from "./nav.js";

const EDITABLE = /^(input|textarea|select)$/i;

// Desktop shortcuts (spec 04 §8.3): 1–4 switch tabs, K runs the primary
// action, D draws. Ignored while typing, inside a sheet, or with modifiers.
export function useShortcuts({ enabled, onTab, onPrimary, onDraw }) {
  useEffect(() => {
    if (!enabled) return undefined;
    const onKeyDown = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.defaultPrevented) return;
      const target = event.target;
      if (target && (EDITABLE.test(target.tagName) || target.isContentEditable)) return;
      if (document.querySelector('[role="dialog"]')) return;
      const key = event.key.toLowerCase();
      if (key >= "1" && key <= "4" && onTab) { onTab(TAB_KEYS[Number(key) - 1]); event.preventDefault(); }
      else if (key === "k" && onPrimary) { onPrimary(); event.preventDefault(); }
      else if (key === "d" && onDraw) { onDraw(); event.preventDefault(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, onTab, onPrimary, onDraw]);
}
