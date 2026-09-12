import { STYLE_PRESETS } from "../../engine/instructions.js";

/* ============================ Style of Play selector ========================= */
/* The first menu on the tactics board. Choosing a style rewrites every dial
   below it at once — this is deliberately the entry point into the whole
   tactics screen, since it's what makes every other customization make sense
   as part of one coherent plan rather than a pile of disconnected sliders. */
export default function StyleSelector({ selectedStyle, onSelect }) {
  return (
    <div className="fmweb-panel rounded-md p-4 shadow-lg shadow-black/30" style={{ width: "100%", boxSizing: "border-box" }}>
      <span className="text-xs font-black uppercase tracking-widest text-emerald-400 block mb-1">1. Style of Play</span>
      <p className="text-xs text-neutral-500 mb-3">Start here. Your style heavily pre-sets every instruction below into one coherent identity. Fine-tune from there, or stray too far and you'll lose the identity bonus.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.5rem", width: "100%" }}>
        {STYLE_PRESETS.map((s) => (
          <button key={s.key} type="button" onClick={() => onSelect(s.key)}
            style={{ minWidth: 0, width: "100%", boxSizing: "border-box", overflowWrap: "break-word" }}
            className={`text-left rounded-md border p-2.5 transition ${selectedStyle === s.key ? "bg-emerald-600 border-emerald-600 text-white" : "bg-neutral-800 border-neutral-700 text-neutral-200 hover:border-emerald-500"}`}>
            <span className="text-xs font-black block">{s.label}</span>
            <span className={`text-xs block mt-0.5 ${selectedStyle === s.key ? "text-neutral-900" : "text-neutral-400"}`} style={{ overflowWrap: "break-word" }}>{s.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
