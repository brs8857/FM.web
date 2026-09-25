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
export function HomeIcon() {
  return <svg {...base}><path d="M3 9.5 10 4l7 5.5V16a1 1 0 0 1-1 1h-4v-5H8v5H4a1 1 0 0 1-1-1z" /></svg>;
}
export function ShareIcon() {
  return <svg {...base}><path d="M10 3v9M6.5 6.5 10 3l3.5 3.5M4 11v5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-5" /></svg>;
}
export function CopyIcon() {
  return <svg {...base}><rect x="7" y="7" width="10" height="10" rx="1.5" /><path d="M13 7V4.5A1.5 1.5 0 0 0 11.5 3h-7A1.5 1.5 0 0 0 3 4.5v7A1.5 1.5 0 0 0 4.5 13H7" /></svg>;
}
export function PauseIcon() {
  return <svg {...base}><path d="M7 4v12M13 4v12" /></svg>;
}
export function PlayIcon() {
  return <svg {...base}><path d="M6 4l10 6-10 6z" /></svg>;
}
