import Pitch from "../pitch/Pitch.jsx";
import BenchStrip from "../pitch/BenchStrip.jsx";
import StyleSelector from "./StyleSelector.jsx";
import RoleEditor from "./RoleEditor.jsx";
import InstructionsPanel from "./InstructionsPanel.jsx";
import TacticsSummary from "./TacticsSummary.jsx";

export default function TacticsScreen({ state, dispatch, activeSlotId, onSelectSlot, dragInfo, onDragStart, profile, familiarity }) {
  const { assignments, bench, instructions } = state;
  const activeAssignment = assignments.find((a) => a.slotId === activeSlotId);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-start", width: "100%" }}>
      <div style={{ flex: "1 1 260px", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" }} className="space-y-3">
        <Pitch assignments={assignments} activeSlotId={activeSlotId} mode="tactics" dragHint
          onSlotClick={onSelectSlot}
          onDragStart={onDragStart}
          draggingId={dragInfo?.kind === "slot" ? dragInfo.id : null} />
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <p className="text-xs text-neutral-500" style={{ flex: "1 1 auto", minWidth: 0 }}>Drag any player anywhere on the pitch to reposition, or drop him on a teammate to swap. Tap to edit role, duty, and sliders.</p>
          <button onClick={() => dispatch({ type: "RESET_POSITIONS" })} style={{ flexShrink: 0 }} className="text-xs px-2 py-1 h-fit rounded-md border border-neutral-700 text-neutral-300 hover:border-emerald-500 transition">Reset shape</button>
        </div>
        <BenchStrip bench={bench} draggable
          onDragStart={onDragStart}
          draggingId={dragInfo?.kind === "bench" ? dragInfo.id : null} />
        <button onClick={() => dispatch({ type: "SIMULATE" })}
          className="w-full px-4 py-3 rounded-md font-bold uppercase tracking-wide text-sm transition fmweb-cta" style={{ background: "#059669", color: "#fff" }}>
          Reveal Ratings &amp; Simulate
        </button>
      </div>
      <div style={{ flex: "2 1 320px", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" }} className="space-y-4">
        <StyleSelector selectedStyle={state.selectedStyle} onSelect={(key) => dispatch({ type: "SET_STYLE", key })} />
        {activeAssignment?.player ? (
          <RoleEditor assignment={{ ...activeAssignment, role: activeAssignment.role }}
            onSetRole={(k) => dispatch({ type: "SET_ROLE", slotId: activeSlotId, roleKey: k })}
            onSetDuty={(d) => dispatch({ type: "SET_DUTY", slotId: activeSlotId, duty: d })}
            onSetSlider={(key, v) => dispatch({ type: "SET_SLIDER", slotId: activeSlotId, key, value: v })}
          />
        ) : (
          <InstructionsPanel instructions={instructions} onSet={(k, v) => dispatch({ type: "SET_INSTRUCTION", key: k, value: v })} />
        )}
      </div>
      <div style={{ flex: "1 1 260px", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" }}>
        <TacticsSummary profile={profile} familiarity={familiarity} instructions={instructions} />
      </div>
    </div>
  );
}
