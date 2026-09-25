import ChipRow from "../../ui/ChipRow.jsx";
import { STYLE_PRESETS } from "../../engine/instructions.js";
import { STYLE_SUB } from "../../content/labels.js";

// The seven presets as chips; Blank slate carries its "no identity bonus" subtitle.
export default function StyleRow({ selectedStyle, onSelect }) {
  const options = STYLE_PRESETS.map((p) => ({ key: p.key, label: p.label, sub: STYLE_SUB[p.key] }));
  return <ChipRow label="Style" options={options} value={selectedStyle ?? ""} onChange={onSelect} />;
}
