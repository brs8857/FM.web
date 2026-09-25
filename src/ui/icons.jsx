const base = { width: 20, height: 20, viewBox: "0 0 20 20", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", focusable: "false" };

export function BackIcon() {
  return <svg {...base}><path d="M12 4 6 10l6 6" /></svg>;
}
export function CloseIcon() {
  return <svg {...base}><path d="M5 5l10 10M15 5 5 15" /></svg>;
}
export function ChevronIcon({ open }) {
  return <svg {...base} style={{ transform: open ? "rotate(180deg)" : undefined }}><path d="M5 8l5 5 5-5" /></svg>;
}
export function InfoIcon() {
  return <svg {...base}><circle cx="10" cy="10" r="7.5" /><path d="M10 9v5M10 6.5v.5" /></svg>;
}
export function MinusIcon() {
  return <svg {...base}><path d="M5 10h10" /></svg>;
}
export function PlusIcon() {
  return <svg {...base}><path d="M10 5v10M5 10h10" /></svg>;
}
export function ArrowIcon() {
  return <svg {...base}><path d="M4 10h12M11 5l5 5-5 5" /></svg>;
}
