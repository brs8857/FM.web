import { SLOT_TYPE_LABEL } from "../../engine/formations.js";
import { ROLES, DUTY_INFO } from "../../engine/roles.js";
import { STAT_KEYS, STAT_LABELS } from "../../engine/players.js";
import { playerContribution } from "../../engine/tactics.js";
import StatPip from "../ui/StatPip.jsx";
import Slider from "../ui/Slider.jsx";

/* ============================ Role / Duty editor ============================ */
export default function RoleEditor({ assignment, onSetRole, onSetSlider, onSetDuty }) {
  const roleOptions = ROLES[assignment.type];
  const role = roleOptions.find((r) => r.key === assignment.role) || roleOptions[0];
  const neutralRole = { att: 0.5, def: 0.5 }; // baseline for showing deltas
  const c = playerContribution({ ...assignment, role, duty: "Support", sliderAtt: 50, sliderDef: 50 });
  const cActual = playerContribution({ ...assignment, role });

  return (
    <div className="fmweb-panel rounded-md p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center rounded-full border-2 border-dashed border-neutral-600 text-neutral-500 w-9 h-9 text-sm font-black">?</div>
        <div>
          <div className="font-black text-neutral-100">{assignment.player.name}</div>
          <div className="text-xs text-neutral-400 uppercase tracking-wide">{SLOT_TYPE_LABEL[assignment.type]} · {assignment.player.nat} · Age {assignment.player.age || "—"}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {STAT_KEYS.map((k) => <div key={k} className="w-1/3"><StatPip label={STAT_LABELS[k]} value={assignment.player.stats[k]} /></div>)}
      </div>

      <div>
        <div className="text-xs uppercase tracking-wide text-neutral-400 mb-1 font-bold">Role</div>
        <select value={role.key} onChange={(e) => onSetRole(e.target.value)}
          className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-2 py-1.5 text-sm text-neutral-50">
          {roleOptions.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
        </select>
        <p className="text-xs text-neutral-400 mt-1.5 italic">{role.desc}</p>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wide text-neutral-400 mb-1 font-bold">Duty</div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {role.duties.map((d) => (
            <button key={d} onClick={() => onSetDuty(d)} style={{ flex: "1 1 0%", minWidth: 0 }}
              className={`px-2 py-1.5 rounded-md text-xs font-bold border transition ${assignment.duty === d ? "bg-emerald-600 text-white border-emerald-600" : "bg-neutral-800 border-neutral-700 text-neutral-200 hover:border-emerald-500"}`}>
              {DUTY_INFO[d].label}
            </button>
          ))}
        </div>
        <p className="text-xs text-neutral-400 mt-1.5 italic">{DUTY_INFO[assignment.duty]?.desc}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }} className="bg-neutral-800/50 rounded-md p-2 text-center">
        <div style={{ minWidth: 0 }}>
          <div className="text-xs text-neutral-400 uppercase">Eff. Attack</div>
          <div className="font-mono font-bold text-emerald-300">{cActual.att.toFixed(0)} <span className="text-xs text-neutral-500">({cActual.att >= c.att ? "+" : ""}{(cActual.att - c.att).toFixed(0)})</span></div>
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="text-xs text-neutral-400 uppercase">Eff. Defense</div>
          <div className="font-mono font-bold text-sky-300">{cActual.def.toFixed(0)} <span className="text-xs text-neutral-500">({cActual.def >= c.def ? "+" : ""}{(cActual.def - c.def).toFixed(0)})</span></div>
        </div>
      </div>
      <p className="text-xs text-neutral-500 -mt-2">vs. that role played on a neutral Support duty — this is how much your Role + Duty choice actually shifts this player's output.</p>

      <div>
        <Slider label="Attacking Freedom" value={assignment.sliderAtt} onChange={(v) => onSetSlider("sliderAtt", v)}
          leftLabel="Disciplined" rightLabel="Free roam"
          tooltip="Rotation license — how far he's encouraged to drift from his zone to combine and join attacks, at the cost of defensive shape." />
        <Slider label="Defensive Discipline" value={assignment.sliderDef} onChange={(v) => onSetSlider("sliderDef", v)}
          leftLabel="Relaxed" rightLabel="Strict"
          tooltip="How rigorously he tracks his runner and holds his defensive line rather than getting drawn out of position." />
      </div>
    </div>
  );
}
