import React, { useReducer, useMemo, useState, useEffect, useRef } from "react";
import { clamp, seasonLabel } from "./engine/util.js";
import { FORMATIONS, SLOT_TYPE_LABEL } from "./engine/formations.js";
import { ROLES, DUTY_INFO } from "./engine/roles.js";
import { STYLE_PRESETS } from "./engine/instructions.js";
import { STAT_KEYS, STAT_LABELS } from "./engine/players.js";
import { playerContribution } from "./engine/tactics.js";
import { familiarityLabel } from "./engine/familiarity.js";
import { tacticalReadout, mentalityLabel } from "./engine/readout.js";
import { CAREER_SEASONS, careerSeasonLabel } from "./engine/season.js";
import { nextEmptySlotIndex } from "./engine/squad.js";
import { createReducer } from "./state/reducer.js";
import { makeInitialState } from "./state/initialState.js";
import { newCareerSeed } from "./state/rngState.js";
import { selectEraIndex, liveAssignments, selectFamiliarity, selectProfile } from "./state/selectors.js";
import { getStorage, readAutosave, clearAutosave, requestPersistentStorage, writeAutosave } from "./state/storage.js";
import { useAutosave } from "./components/app/useAutosave.js";
import { hydrateState, describeSave, makeSaveEnvelope, toSaveText } from "./state/save.js";
import { saveFileName, exportSaveText, readImportFile } from "./state/exportImport.js";
import { APP_VERSION } from "./version.js";
import ResumeCard from "./components/app/ResumeCard.jsx";
import StorageBanner from "./components/app/StorageBanner.jsx";
import SaveMenu from "./components/app/SaveMenu.jsx";
import StatPip from "./components/ui/StatPip.jsx";
import OvBadge from "./components/ui/OvBadge.jsx";
import PlayerMiniCard from "./components/ui/PlayerMiniCard.jsx";
import RadarChart from "./components/ui/RadarChart.jsx";
import Slider from "./components/ui/Slider.jsx";

/* ============================== Wheel Spinner ================================= */
function WheelSpinner({ spinning, landed, onSpin, onDone, targetLabel, pool }) {
  const [display, setDisplay] = useState("Spin to draft a club season");
  const [fading, setFading] = useState(false);
  const [justLanded, setJustLanded] = useState(false);
  const timerRef = useRef(null);
  const fadeRef = useRef(null);

  useEffect(() => {
    if (!spinning) return;
    let i = 0;
    const idx = pool;
    const total = 14; // fewer, faster ticks than before — a quick, confident spin rather than a long crawl
    function tick() {
      i++;
      if (i >= total) {
        // last tick — don't bother fading to another random label, the real
        // result is about to land via the `landed` prop a moment later
        onDone();
        return;
      }
      // eslint-disable-next-line no-restricted-properties -- cosmetic flicker only; the real result comes from the reducer
      const r = idx[Math.floor(Math.random() * idx.length)];
      setFading(true);
      fadeRef.current = setTimeout(() => { setDisplay(r.label); setFading(false); }, 35);
      const progress = i / total;
      const delay = 26 + Math.pow(progress, 2.3) * 100; // eases from a fast blur into a settling stop
      timerRef.current = setTimeout(tick, delay);
    }
    tick();
    return () => { clearTimeout(timerRef.current); clearTimeout(fadeRef.current); };
    // eslint-disable-next-line
  }, [spinning]);

  useEffect(() => {
    if (landed) {
      setDisplay(landed.label);
      setFading(false); // guard against the fade getting stuck mid-transition when the spin hands off to the real result
      setJustLanded(true);
      const t = setTimeout(() => setJustLanded(false), 420);
      return () => clearTimeout(t);
    }
  }, [landed]);

  useEffect(() => {
    if (!spinning && !landed) setDisplay("Spin to draft a club season");
  }, [spinning, landed]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className={`w-full max-w-sm rounded-md border-2 bg-neutral-950 px-6 py-8 text-center transition-colors duration-300 ${spinning ? "border-emerald-500" : justLanded ? "border-amber-500" : "border-neutral-800"}`}>
        <div className="text-xs uppercase text-neutral-500 mb-2" style={{ letterSpacing: "0.2em" }}>{spinning ? "Spinning..." : landed ? "Landed on" : "Ready"}</div>
        <div className={`text-2xl font-black text-white transition-all duration-150 ease-out ${fading ? "opacity-0" : "opacity-100"} ${justLanded ? "scale-105" : "scale-100"}`} style={{ transform: fading ? "scale(0.97)" : undefined }}>{display}</div>
      </div>
      {!spinning && !landed && (
        <button onClick={onSpin} className="px-8 py-3 rounded-md font-bold uppercase tracking-wide text-sm transition fmweb-cta" style={{ background: "#059669", color: "#fff" }}>
          Spin the wheel — draft {targetLabel}
        </button>
      )}
    </div>
  );
}

/* ============================== Pitch view ================================= */
/* Proportionally-accurate pitch markings, derived from a real 68m x 100m
   pitch mapped onto our 0-100 x / 0-100 y coordinate system (the container's
   aspect ratio is set so 1% of x and 1% of y represent the same real-world
   distance, which is what keeps the center circle actually circular). */
function PitchMarkings() {
  const PEN_W = 59.3, PEN_D = 16.5;     // 18-yard box: 40.32m x 16.5m
  const SIX_W = 26.9, SIX_D = 5.5;      // 6-yard box: 18.32m x 5.5m
  const GOAL_W = 10.76;                 // goal mouth: 7.32m
  const CIRC_RX = 13.46, CIRC_RY = 9.15; // center circle radius: 9.15m
  const SPOT_Y = 11;                    // penalty spot: 11m from goal line
  const ARC_BULGE = 3.65;               // how far the "D" bulges past the box
  const lineCls = "absolute border-white/25";

  const Box = (w, d, fromTop) => (
    <div className={`${lineCls} border-2`} style={{
      left: `${50 - w / 2}%`, width: `${w}%`,
      ...(fromTop ? { top: 0, borderTop: "none" } : { bottom: 0, borderBottom: "none" }),
      height: `${d}%`,
    }} />
  );

  const Spot = (y) => (
    <div className="absolute w-1 h-1 rounded-full bg-white/40 -translate-x-1/2 -translate-y-1/2" style={{ left: "50%", top: `${y}%` }} />
  );

  const GoalMouth = (fromTop) => (
    <div className="absolute bg-white/40" style={{
      left: `${50 - GOAL_W / 2}%`, width: `${GOAL_W}%`, height: "3px",
      ...(fromTop ? { top: 0 } : { bottom: 0 }),
    }} />
  );

  // The "D": a full ring centered on the penalty spot, clipped by a thin
  // overflow-hidden band so only the bulge beyond the box edge is visible.
  const Arc = (fromTop) => {
    const bandStart = fromTop ? PEN_D : 100 - PEN_D - ARC_BULGE;
    const topInset = bandStart;
    const bottomInset = 100 - bandStart - ARC_BULGE;
    const spotY = fromTop ? SPOT_Y : 100 - SPOT_Y;
    return (
      <div className="absolute inset-0" style={{ clipPath: `inset(${topInset}% 0% ${bottomInset}% 0%)` }}>
        <div className="absolute rounded-full border-2 border-white/25" style={{
          left: "50%", top: `${spotY}%`, width: `${CIRC_RX * 2}%`, height: `${CIRC_RY * 2}%`,
          transform: "translate(-50%, -50%)",
        }} />
      </div>
    );
  };

  const Corner = (left, top) => (
    <div className="absolute rounded-full border-2 border-white/25" style={{
      left: `${left}%`, top: `${top}%`, width: "3%", height: "2%", transform: "translate(-50%, -50%)",
    }} />
  );

  return (
    <>
      {/* outer touchlines */}
      <div className="absolute inset-2 border-2 border-white/25" />
      {/* halfway line */}
      <div className="absolute left-1/2 top-1/2 w-full h-px bg-white/25 -translate-x-1/2 -translate-y-1/2" />
      {/* center circle + spot */}
      <div className="absolute rounded-full border-2 border-white/25 -translate-x-1/2 -translate-y-1/2"
        style={{ left: "50%", top: "50%", width: `${CIRC_RX * 2}%`, height: `${CIRC_RY * 2}%` }} />
      {Spot(50)}
      {/* 18-yard boxes */}
      {Box(PEN_W, PEN_D, true)}
      {Box(PEN_W, PEN_D, false)}
      {/* 6-yard boxes */}
      {Box(SIX_W, SIX_D, true)}
      {Box(SIX_W, SIX_D, false)}
      {/* penalty spots + arcs */}
      {Spot(SPOT_Y)}
      {Spot(100 - SPOT_Y)}
      {Arc(true)}
      {Arc(false)}
      {/* goal mouths */}
      {GoalMouth(true)}
      {GoalMouth(false)}
      {/* corner arcs */}
      {Corner(0, 0)}
      {Corner(100, 0)}
      {Corner(0, 100)}
      {Corner(100, 100)}
    </>
  );
}

function Pitch({ assignments, onSlotClick, activeSlotId, mode, onDragStart, draggingId, dragHint }) {
  const draggable = mode === "tactics";

  return (
    <div className="w-full max-w-sm mx-auto" style={{ filter: "drop-shadow(0 14px 22px rgba(0,0,0,0.55))" }}>
      <div className="relative w-full" style={{ paddingTop: `${(100 / 68) * 100}%` }}>
        <div className="absolute inset-0 rounded-md overflow-hidden border-2 border-emerald-500/40 shadow-2xl shadow-black/50" data-drop-zone="pitch"
          style={{ background: "repeating-linear-gradient(0deg, #14532d, #14532d 12%, #15582f 12%, #15582f 24%)", touchAction: draggable ? "none" : "auto" }}>
          <PitchMarkings />
          {assignments.map((a) => {
          const filled = !!a.player;
          const isActive = activeSlotId === a.slotId;
          const isDragging = draggingId === a.slotId;
          return (
            <button key={a.slotId} onClick={() => onSlotClick(a.slotId)}
              data-slot-id={a.slotId}
              onPointerDown={(e) => { if (draggable && filled) { e.preventDefault(); onDragStart("slot", a.slotId); } }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 group select-none"
              style={{ left: `${a.pos.x}%`, top: `${a.pos.y}%`, zIndex: isDragging ? 30 : 10, touchAction: draggable ? "none" : "auto" }}>
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs font-black border transition
                ${filled ? "bg-neutral-50 border-neutral-300 text-neutral-900 shadow-md" : "bg-neutral-900/60 border-dashed border-neutral-600 text-neutral-400"}
                ${isActive ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-neutral-950" : ""}
                ${isDragging ? "opacity-40 ring-2 ring-sky-400" : ""}
                ${draggable && filled ? "cursor-grab active:cursor-grabbing" : ""}`}>
                {a.type}
              </div>
              <div className="px-1.5 py-0.5 rounded-sm bg-neutral-950/90 border border-neutral-800 text-xs text-neutral-200 whitespace-nowrap truncate pointer-events-none" style={{ maxWidth: "90px" }}>
                {filled ? a.player.name.split(" ").slice(-1)[0] : (mode === "draft" ? "Empty" : a.slotId)}
              </div>
            </button>
          );
        })}
        {dragHint && (
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-xs text-emerald-200/70 bg-neutral-950/70 px-2 py-0.5 rounded-full whitespace-nowrap pointer-events-none">
            Drag anywhere to reposition — drop on a teammate to swap
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

/* ============================ Role / Duty editor ============================ */
/* ================================ Bench strip ================================ */
function BenchStrip({ bench, onDragStart, draggingId, draggable }) {
  return (
    <div className="fmweb-panel rounded-md p-3" data-drop-zone="bench">
      <div className="text-xs uppercase tracking-wide text-neutral-400 font-bold mb-2">Bench {draggable && <span className="normal-case font-normal text-neutral-500">— drag on/off the pitch</span>}</div>
      <div className="space-y-1.5">
        {bench.map((b, i) => (
          <div key={i}
            data-bench-idx={i}
            onPointerDown={(e) => { if (draggable && b.player) { e.preventDefault(); onDragStart("bench", i); } }}
            className={`text-xs flex items-center justify-between rounded px-2 py-1.5 border transition select-none
              ${b.player ? "bg-neutral-800/60 border-neutral-800" : "bg-neutral-950/40 border-dashed border-neutral-800 text-neutral-500"}
              ${draggingId === i ? "opacity-40 ring-2 ring-sky-300" : ""} ${draggable && b.player ? "cursor-grab active:cursor-grabbing" : ""}`}
            style={{ touchAction: draggable ? "none" : "auto" }}>
            <span className="truncate pointer-events-none">{b.player ? b.player.name : "Empty"}</span>
            {b.player && <span className="text-neutral-400 shrink-0 pointer-events-none">{b.player.slot}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}


function RoleEditor({ assignment, onSetRole, onSetSlider, onSetDuty }) {
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

/* ============================ Style of Play selector ========================= */
/* The first menu on the tactics board. Choosing a style rewrites every dial
   below it at once — this is deliberately the entry point into the whole
   tactics screen, since it's what makes every other customization make sense
   as part of one coherent plan rather than a pile of disconnected sliders. */
function StyleSelector({ selectedStyle, onSelect }) {
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

function InstructionsPanel({ instructions, onSet }) {
  return (
    <div className="fmweb-panel rounded-md p-4 shadow-lg shadow-black/30">
      <span className="text-xs font-black uppercase tracking-widest text-neutral-400 block mb-3">2. Team Instructions</span>
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
          <span className="uppercase tracking-wide font-bold text-neutral-300">Mentality</span>
          <span className="font-mono text-emerald-300">{mentalityLabel(instructions.mentality)}</span>
        </div>
        <input type="range" min="0" max="100" value={instructions.mentality} onChange={(e) => onSet("mentality", Number(e.target.value))}
          className="w-full accent-amber-400 h-2 cursor-pointer" />
        <div className="flex items-center justify-between text-xs text-neutral-500 mt-0.5"><span>Very Defensive</span><span>Very Attacking</span></div>
        <p className="text-xs text-neutral-500 mt-1">The master dial — scales risk and reward across everything below.</p>
      </div>

      <div className="border-t border-neutral-800 pt-3 mb-1">
        <div className="text-xs uppercase tracking-widest text-neutral-500 font-bold mb-2">In possession</div>
        <Slider label="Tempo" value={instructions.tempo} onChange={(v) => onSet("tempo", v)} leftLabel="Slow build-up" rightLabel="High tempo"
          tooltip="Speed of ball circulation once you have possession — slow tempo controls the game, high tempo looks to overwhelm before a defence can set." />
        <Slider label="Directness" value={instructions.directness} onChange={(v) => onSet("directness", v)} leftLabel="Short passing" rightLabel="Direct / long"
          tooltip="Short passing builds through the thirds and retains control; direct passing skips the midfield battle entirely to progress territory fast." />
        <Slider label="Width" value={instructions.width} onChange={(v) => onSet("width", v)} leftLabel="Narrow" rightLabel="Wide"
          tooltip="How far the team stretches the pitch horizontally — wide play creates space centrally, narrow play packs the half-spaces for combinations." />
        <Slider label="Passing Focus" value={instructions.focus} onChange={(v) => onSet("focus", v)} leftLabel="Through the middle" rightLabel="Down the flanks"
          tooltip="Where the team looks to progress the ball — combination play through the half-spaces, or overloads down the channels." />
        <Slider label="Counter-Attacking" value={instructions.counter} onChange={(v) => onSet("counter", v)} leftLabel="Reset shape" rightLabel="Break at pace"
          tooltip="How eagerly the team breaks vertically the instant possession is won, rather than resetting shape first — devastating in transition, costly if it turns the ball over cheaply." />
        <Slider label="Crossing Frequency" value={instructions.crossing} onChange={(v) => onSet("crossing", v)} leftLabel="Cut inside" rightLabel="Cross often"
          tooltip="How often wide players look to deliver early rather than cut inside. Wasted without genuine width and aerial presence to attack the ball." />
        <Slider label="Goalkeeper Distribution" value={instructions.gkDistribution} onChange={(v) => onSet("gkDistribution", v)} leftLabel="Play out short" rightLabel="Go long"
          tooltip="Whether your keeper builds from the back under pressure or goes long to bypass the opposition's press and fight for the second ball." />
      </div>

      <div className="border-t border-neutral-800 pt-3 mb-1">
        <div className="text-xs uppercase tracking-widest text-neutral-500 font-bold mb-2">Out of possession</div>
        <Slider label="Pressing Intensity" value={instructions.press} onChange={(v) => onSet("press", v)} leftLabel="Drop off" rightLabel="High press"
          tooltip="How aggressively the team hunts turnovers and how high up the pitch that engagement line starts — a high press invites risk in behind." />
        <Slider label="Defensive Line" value={instructions.line} onChange={(v) => onSet("line", v)} leftLabel="Deep block" rightLabel="High line"
          tooltip="Where the back line holds its position. A high line compresses space for the press to work in, but leaves it exposed to balls played in behind." />
        <Slider label="Tackling Intensity" value={instructions.tackling} onChange={(v) => onSet("tackling", v)} leftLabel="Cautious" rightLabel="Aggressive"
          tooltip="Intensity of the tackle — aggressive tackling wins more duels but risks fouls, cards, and a numerical disadvantage." />
        <div className="mb-3">
          <div className="text-xs uppercase tracking-wide font-bold text-neutral-300 mb-1">Marking</div>
          <div className="flex gap-2">
            {["zonal", "man"].map((m) => (
              <button key={m} onClick={() => onSet("marking", m)} className={`flex-1 px-2 py-1.5 rounded-md text-xs font-bold border capitalize ${instructions.marking === m ? "bg-sky-400 text-neutral-950 border-sky-400" : "bg-neutral-800 border-neutral-700 text-neutral-300"}`}>{m}</button>
            ))}
          </div>
          <p className="text-xs text-neutral-500 mt-1">Zonal defends space; man-marking defends the opponent — more secure one-on-one, more exploitable if dragged out of position.</p>
        </div>
        <div className="mb-1">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs uppercase tracking-wide font-bold text-neutral-300">Offside Trap</div>
            <button onClick={() => onSet("offsideTrap", !instructions.offsideTrap)}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition ${instructions.offsideTrap ? "bg-rose-400 text-neutral-950 border-rose-400" : "bg-neutral-800 border-neutral-700 text-neutral-300"}`}>
              {instructions.offsideTrap ? "On" : "Off"}
            </button>
          </div>
          <p className="text-xs text-neutral-500">A high-risk, high-reward line trap — a big defensive boost if your back line is fast and disciplined and playing a high line, a real liability otherwise.</p>
        </div>
      </div>

      <div className="border-t border-neutral-800 pt-3">
        <div className="text-xs uppercase tracking-widest text-neutral-500 font-bold mb-2">Team Shape</div>
        <div className="flex gap-2">
          {["structured", "fluid"].map((s) => (
            <button key={s} onClick={() => onSet("shape", s)} className={`flex-1 px-2 py-1.5 rounded-md text-xs font-bold border capitalize ${instructions.shape === s ? "bg-violet-400 text-neutral-950 border-violet-400" : "bg-neutral-800 border-neutral-700 text-neutral-300"}`}>{s}</button>
          ))}
        </div>
        <p className="text-xs text-neutral-500 mt-1">Structured keeps players tight to their roles; fluid lets them drift and interchange more freely.</p>
      </div>
    </div>
  );
}

/* ========================= Tactics Summary (radar + familiarity) =========== */
function TacticsSummary({ profile, familiarity, instructions }) {
  const radarData = [
    { label: "Attack", value: profile.attack },
    { label: "Creativity", value: profile.creativity },
    { label: "Buildup", value: profile.buildup },
    { label: "Press", value: profile.press },
    { label: "Defense", value: profile.defSolidity },
    { label: "Physical", value: profile.physical },
  ];
  const readout = tacticalReadout(profile, instructions, familiarity);
  const famColor = familiarity >= 70 ? "bg-emerald-400" : familiarity >= 50 ? "bg-amber-400" : "bg-rose-400";

  return (
    <div className="fmweb-panel rounded-md p-4 shadow-lg shadow-black/30">
      <RadarChart data={radarData} />
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="uppercase tracking-wide font-bold text-neutral-300">Tactical Familiarity</span>
          <span className="font-mono text-neutral-200">{familiarity} · {familiarityLabel(familiarity)}</span>
        </div>
        <div className="h-2 bg-neutral-800 rounded-full overflow-hidden"><div className={`h-full ${famColor}`} style={{ width: `${familiarity}%` }} /></div>
        <p className="text-xs text-neutral-500 mt-1">How well-drilled this exact system is. Sensible, coherent setups raise it; extreme or mismatched ones cost a little consistency in the simulation.</p>
      </div>
      <div className="mt-3 space-y-1.5">
        {readout.map((r, i) => (
          <p key={i} className="text-xs text-neutral-300 bg-neutral-800/60 rounded-md px-2 py-1.5 border border-neutral-800">{r}</p>
        ))}
      </div>
    </div>
  );
}

/* ============================ Formation Select screen ======================= */
/* ============================ Era range slider ================================ */
/* A true dual-handle range slider (two independently draggable thumbs, pointer
   -based so it works on touch too) letting the player pick exactly which
   Premier League seasons the draft wheel is allowed to land on. */
function EraRangeSlider({ min, max, valueMin, valueMax, onChange }) {
  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(null); // 'min' | 'max' | null

  useEffect(() => {
    if (!dragging || !trackRef.current) return;
    function yearFromEvent(e) {
      const point = e.touches ? e.touches[0] : e;
      const rect = trackRef.current.getBoundingClientRect();
      const pct = clamp((point.clientX - rect.left) / rect.width, 0, 1);
      return Math.round(min + pct * (max - min));
    }
    function onMove(e) {
      const year = yearFromEvent(e);
      if (dragging === "min") onChange(Math.min(year, valueMax), valueMax);
      else onChange(valueMin, Math.max(year, valueMin));
    }
    function onUp() { setDragging(null); }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragging, valueMin, valueMax, min, max, onChange]);

  const pctMin = ((valueMin - min) / (max - min)) * 100;
  const pctMax = ((valueMax - min) / (max - min)) * 100;
  const Handle = (which, pct) => (
    <button
      onPointerDown={(e) => { e.preventDefault(); setDragging(which); }}
      onTouchStart={(e) => { e.preventDefault(); setDragging(which); }}
      className={`absolute top-1/2 w-6 h-6 rounded-full bg-white border-4 border-emerald-500 -translate-x-1/2 -translate-y-1/2 shadow cursor-grab active:cursor-grabbing ${dragging === which ? "scale-110 ring-2 ring-emerald-300" : ""}`}
      style={{ left: `${pct}%`, touchAction: "none" }}
    />
  );

  return (
    <div className="pt-2 pb-1">
      <div ref={trackRef} className="relative h-2 bg-neutral-700 rounded-full" style={{ touchAction: "none" }}>
        <div className="absolute h-2 bg-emerald-400 rounded-full" style={{ left: `${pctMin}%`, width: `${pctMax - pctMin}%` }} />
        {Handle("min", pctMin)}
        {Handle("max", pctMax)}
      </div>
      <div className="flex justify-between text-xs text-neutral-500 mt-3">
        <span>{seasonLabel(min)}</span>
        <span>{seasonLabel(max)}</span>
      </div>
    </div>
  );
}

function FormationSelect({ formationKey, onPick, onStart, assignments, eraMin, eraMax, onSetEra }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", width: "100%", alignItems: "flex-start" }}>
      <div style={{ flex: "3 1 380px", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" }}>
        <h2 className="text-lg font-black mb-1 text-white">Choose your era</h2>
        <p className="text-sm text-neutral-400 mb-2">Drag either handle to set which Premier League seasons the draft wheel is allowed to land on — pick a single golden era, or leave it wide open for the full history.</p>
        <div className="fmweb-panel rounded-md p-4 mb-6 shadow-lg shadow-black/30">
          <div className="text-center text-lg font-black text-emerald-400 mb-1">{seasonLabel(eraMin)} — {seasonLabel(eraMax)}</div>
          <EraRangeSlider min={1992} max={2024} valueMin={eraMin} valueMax={eraMax} onChange={onSetEra} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
            {[
              ["Full History", 1992, 2024], ["90s", 1992, 1999], ["2000s", 2000, 2009],
              ["2010s", 2010, 2019], ["Modern Era", 2020, 2024],
            ].map(([label, mn, mx]) => (
              <button key={label} onClick={() => onSetEra(mn, mx)} style={{ minWidth: 0 }}
                className="px-2.5 py-1 rounded-full text-xs font-bold border border-neutral-700 text-neutral-300 hover:border-emerald-400 hover:text-emerald-300 transition">
                {label}
              </button>
            ))}
          </div>
        </div>

        <h2 className="text-lg font-black mb-1 text-white">Choose your formation</h2>
        <p className="text-sm text-neutral-400 mb-4">This sets the 11 slots you'll fill during the draft, and the shape you'll fine-tune on the tactics board afterward.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {Object.keys(FORMATIONS).map((k) => (
            <button key={k} onClick={() => onPick(k)} style={{ flex: "1 1 110px", minWidth: 0 }}
              className={`px-3 py-3 rounded-md border text-center font-black text-sm transition ${formationKey === k ? "bg-emerald-600 text-white border-emerald-600" : "bg-neutral-900 border-neutral-800 text-neutral-200 hover:border-emerald-600"}`}>
              {FORMATIONS[k].label}
            </button>
          ))}
        </div>
        <button onClick={onStart} className="mt-6 px-8 py-3 rounded-md font-bold uppercase tracking-wide text-sm transition fmweb-cta" style={{ background: "#059669", color: "#fff" }}>
          Start the draft →
        </button>
        <div className="mt-8 fmweb-panel rounded-md p-4 text-sm text-neutral-300 space-y-2 shadow-lg shadow-black/30">
          <div className="font-bold text-neutral-200">How the draft works</div>
          <p className="text-neutral-400 text-sm">Spin the wheel to land on a real Premier League club season from your chosen era. That squad's pool only ever shows the exact position you're filling — land on a goalkeeper slot and you'll only see that club's goalkeepers. Draft one, watch him appear on the pitch, then spin for the next slot. Once your XI is complete a bench is added automatically.</p>
        </div>
      </div>
      <div style={{ flex: "1 1 280px", minWidth: 0, maxWidth: "320px", boxSizing: "border-box" }}>
        <Pitch assignments={assignments} activeSlotId={null} mode="draft" onSlotClick={() => {}} onDragStart={() => {}} />
      </div>
    </div>
  );
}

/* ================================ Draft screen =============================== */
function DraftScreen({ formationKey, assignments, bench, wheel, pool, draftTargetSlotId, draftTargetLabel, draftComplete, eraMin, eraMax, eraIndex, onSpin, onDoneSpin, onPick, onGotoTactics }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", width: "100%", alignItems: "flex-start" }}>
      <div style={{ flex: "1 1 260px", minWidth: 0, maxWidth: "320px", boxSizing: "border-box" }} className="space-y-3">
        <Pitch assignments={assignments} activeSlotId={draftComplete ? null : draftTargetSlotId} mode="draft" onSlotClick={() => {}} onDragStart={() => {}} />
        <p className="text-xs text-neutral-500 text-center">The pitch fills in live as you draft — the pulsing slot is the one you're filling next.</p>
        <div className="fmweb-panel rounded-md px-3 py-2 text-center shadow-lg shadow-black/20">
          <div className="text-xs uppercase tracking-wide text-neutral-500 font-bold">Drafting Era</div>
          <div className="text-sm font-black text-emerald-400">{seasonLabel(eraMin)} – {seasonLabel(eraMax)}</div>
        </div>
        {draftComplete && bench.length > 0 && (
          <div className="fmweb-panel rounded-md p-3 shadow-lg shadow-black/20">
            <div className="text-xs uppercase tracking-wide text-neutral-400 font-bold mb-2">Bench (auto-added, {bench.length})</div>
            <div className="space-y-1">
              {bench.map((b, i) => (
                <div key={i} className="text-xs flex items-center justify-between bg-neutral-800/60 rounded px-2 py-1">
                  <span className="truncate">{b.player.name}</span>
                  <span className="text-neutral-400">{b.player.slot}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-neutral-500 mt-2">Pulled from the same squads you drafted from — you can still drag bench players into the XI on the tactics board.</p>
          </div>
        )}
      </div>

      <div style={{ flex: "3 1 380px", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" }}>
        {!draftComplete ? (
          <div className="mb-6">
            <div className="text-xs uppercase tracking-wide text-neutral-400 font-bold mb-2">Now drafting: <span className="text-emerald-400">{draftTargetLabel}</span></div>
            <WheelSpinner spinning={wheel.spinning} landed={wheel.landed} onSpin={onSpin} onDone={onDoneSpin} targetLabel={draftTargetLabel} pool={eraIndex} />
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center", justifyContent: "space-between" }}
            className="mb-6 fmweb-panel rounded-md p-4">
            <div style={{ minWidth: 0 }}>
              <div className="font-black text-neutral-100">Starting XI complete</div>
              <div className="text-xs text-neutral-400">A bench has been added automatically. Head to the tactics board when you're ready.</div>
            </div>
            <button onClick={onGotoTactics} style={{ flexShrink: 0, background: "#059669", color: "#fff" }} className="px-5 py-2.5 rounded-md font-bold uppercase tracking-wide text-xs transition h-fit fmweb-cta">
              Go to Tactics →
            </button>
          </div>
        )}

        {!draftComplete && wheel.landed && pool.length > 0 && (
          <div>
            <div className="text-xs uppercase tracking-wide text-neutral-400 font-bold mb-2">
              Squad pool — only {SLOT_TYPE_LABEL[assignments.find((a) => a.slotId === draftTargetSlotId)?.type] || ""}s from this club season — pick one
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {pool.map((p) => (
                <div key={p.id} style={{ flex: "1 1 220px", minWidth: 0 }}><PlayerMiniCard player={p} onClick={() => onPick(p)} hideRating /></div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================ Result screen ============================= */
function ResultCard({ simulation, formationKey, assignments, onReset, onContinue, instant }) {
  const { w, d, l, gf, ga, pts, tier, position, profile, familiarity, instructions, season } = simulation;
  const starName = [...assignments].sort((a, b) => (b.player?.ov || 0) - (a.player?.ov || 0))[0]?.player;
  const seasonLbl = careerSeasonLabel(season);
  const isFinalSeason = season >= CAREER_SEASONS;
  const tierColors = {
    amber: "from-amber-400 via-yellow-300 to-amber-500 text-neutral-950",
    emerald: "from-emerald-400 via-emerald-300 to-emerald-500 text-neutral-950",
    sky: "from-sky-400 via-sky-300 to-sky-500 text-neutral-950",
    violet: "from-violet-400 via-violet-300 to-violet-500 text-neutral-950",
    slate: "from-gray-400 via-gray-300 to-gray-500 text-neutral-950",
    rose: "from-rose-400 via-rose-300 to-rose-500 text-neutral-950",
  };

  // The season plays out live, one result at a time, rather than dumping the
  // final table instantly — a running tally builds match by match, and the
  // final verdict only reveals once the season has actually finished.
  const total = simulation.matches.length;
  const [revealed, setRevealed] = useState(instant ? total : 0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (instant) {
      setRevealed(total);
      return undefined;
    }
    setRevealed(0);
    let i = 0;
    function tick() {
      i++;
      setRevealed(i);
      if (i < total) {
        const progress = i / total;
        const delay = 55 - progress * 30; // settles from ~55ms/match to ~25ms/match — quick, but felt
        timerRef.current = setTimeout(tick, delay);
      }
    }
    timerRef.current = setTimeout(tick, 250);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line
  }, [simulation]);

  const live = simulation.matches.slice(0, revealed);
  const lw = live.filter((m) => m.outcome === "W").length;
  const ld = live.filter((m) => m.outcome === "D").length;
  const ll = live.filter((m) => m.outcome === "L").length;
  const lpts = lw * 3 + ld;
  const done = revealed >= total;

  return (
    <div className="max-w-md mx-auto space-y-4">
      {!done ? (
        <div className="rounded-md p-6 bg-neutral-900 border-2 border-emerald-500/40 shadow-2xl text-center">
          <div className="text-xs uppercase font-black text-amber-400" style={{ letterSpacing: "0.3em" }}>Season {season} · {seasonLbl}</div>
          <div className="text-sm text-neutral-400 mt-1">Matchweek {revealed} of {total}</div>
          <div className="flex gap-2 mt-4 text-center justify-center">
            <div className="flex-1"><div className="text-2xl font-black text-white">{lw}</div><div className="text-xs font-bold uppercase text-neutral-500">Won</div></div>
            <div className="flex-1"><div className="text-2xl font-black text-white">{ld}</div><div className="text-xs font-bold uppercase text-neutral-500">Drawn</div></div>
            <div className="flex-1"><div className="text-2xl font-black text-white">{ll}</div><div className="text-xs font-bold uppercase text-neutral-500">Lost</div></div>
            <div className="flex-1"><div className="text-2xl font-black text-emerald-400">{lpts}</div><div className="text-xs font-bold uppercase text-neutral-500">Points</div></div>
          </div>
          {live.length > 0 && (
            <div className="mt-4 text-xs text-neutral-300 bg-neutral-800/50 rounded px-3 py-2">
              Week {live[live.length - 1].week}: {live[live.length - 1].home ? "vs" : "@"} {live[live.length - 1].opponent} — {live[live.length - 1].gf}-{live[live.length - 1].ga}
              <span className={`ml-2 font-black ${live[live.length - 1].outcome === "W" ? "text-emerald-400" : live[live.length - 1].outcome === "D" ? "text-neutral-300" : "text-rose-400"}`}>{live[live.length - 1].outcome}</span>
            </div>
          )}
        </div>
      ) : (
        <div className={`rounded-md p-6 bg-gradient-to-br ${tierColors[tier.color]} shadow-2xl relative overflow-hidden fmweb-phase`}
          style={{ boxShadow: "0 20px 45px -10px rgba(0,0,0,0.75), 0 1px 0 0 rgba(255,255,255,0.12) inset" }}>
          <div className="text-xs uppercase font-black opacity-70" style={{ letterSpacing: "0.3em" }}>FM.WEB · Season {season} · {seasonLbl}</div>
          <div className="text-3xl font-black mt-1 leading-tight">{tier.name}</div>
          <div className="text-sm font-bold opacity-80 mt-1">{tier.sub}</div>
          <div className="flex gap-2 mt-4 text-center">
            <div className="flex-1"><div className="text-2xl font-black">{w}</div><div className="text-xs font-bold uppercase opacity-70">Won</div></div>
            <div className="flex-1"><div className="text-2xl font-black">{d}</div><div className="text-xs font-bold uppercase opacity-70">Drawn</div></div>
            <div className="flex-1"><div className="text-2xl font-black">{l}</div><div className="text-xs font-bold uppercase opacity-70">Lost</div></div>
            <div className="flex-1"><div className="text-2xl font-black">{pts}</div><div className="text-xs font-bold uppercase opacity-70">Points</div></div>
          </div>
          <div className="mt-3 text-xs font-bold opacity-80">GF {gf} · GA {ga} · GD {gf - ga >= 0 ? "+" : ""}{gf - ga} · Finished {position}{position === 1 ? "st" : position === 2 ? "nd" : position === 3 ? "rd" : "th"}</div>
          <div className="mt-3 pt-3 border-t border-black/10 text-xs font-bold flex items-center justify-between">
            <span>{FORMATIONS[formationKey].label} · {starName?.name || "—"} led the line</span>
            <span>#FMweb</span>
          </div>
        </div>
      )}

      {done && (
        <div className="fmweb-panel rounded-md p-4 shadow-lg shadow-black/30">
          <div className="text-xs uppercase tracking-wide font-bold text-neutral-300 mb-2">Final Table · {seasonLbl} Premier League</div>
          <p className="text-xs text-neutral-500 mb-2">The real 19 top-flight rivals, with your XI taking Fulham's place. Rivals' points are estimated from squad strength; yours are your actual simulated results.</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-neutral-500 uppercase text-xs tracking-wide">
                <th className="text-left font-bold pb-1 pl-1">#</th>
                <th className="text-left font-bold pb-1">Club</th>
                <th className="text-right font-bold pb-1 pr-1">Pts</th>
              </tr>
            </thead>
            <tbody>
              {simulation.table.map((row) => (
                <tr key={row.name} className={`${row.isUser ? "bg-emerald-400/15" : row.position % 2 === 0 ? "bg-neutral-800/30" : ""}`}>
                  <td className={`py-1 pl-1 font-mono ${row.isUser ? "text-emerald-300 font-black" : row.position <= 5 ? "text-sky-400" : row.position >= 18 ? "text-rose-400" : "text-neutral-400"}`}>{row.position}</td>
                  <td className={`py-1 truncate ${row.isUser ? "text-emerald-200 font-black" : "text-neutral-300"}`}>{row.name}</td>
                  <td className={`py-1 pr-1 text-right font-mono ${row.isUser ? "text-emerald-300 font-black" : "text-neutral-300"}`}>{row.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="fmweb-panel rounded-md p-4 shadow-lg shadow-black/30">
        <div className="text-xs uppercase tracking-wide font-bold text-neutral-300 mb-2">Match log — in fixture order</div>
        <div className="space-y-1">
          {live.map((m) => (
            <div key={m.week} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-neutral-800/50">
              <span className="text-neutral-400 w-6">{m.week}</span>
              <span className="flex-1 truncate text-neutral-300">{m.home ? "vs" : "@"} {m.opponent}</span>
              <span className="font-mono text-neutral-200 w-10 text-right">{m.gf}-{m.ga}</span>
              <span className={`w-5 text-center font-black ${m.outcome === "W" ? "text-emerald-400" : m.outcome === "D" ? "text-neutral-400" : "text-rose-400"}`}>{m.outcome}</span>
            </div>
          ))}
        </div>
      </div>

      {done && <TacticsSummary profile={profile} familiarity={familiarity} instructions={instructions} />}

      {done && !isFinalSeason && (
        <div className="space-y-2">
          <button onClick={onContinue} className="w-full px-6 py-3 rounded-md font-bold uppercase tracking-wide text-sm transition fmweb-cta" style={{ background: "#059669", color: "#fff" }}>
            Continue to Season {season + 1} · {careerSeasonLabel(season + 1)} →
          </button>
          <button onClick={onReset} className="w-full px-6 py-3 rounded-md bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 font-bold uppercase tracking-wide text-xs transition">
            Retire &amp; Build a New XI
          </button>
        </div>
      )}

      {done && isFinalSeason && (
        <div className="space-y-2">
          <div className="fmweb-panel rounded-md p-4 text-center shadow-lg shadow-black/30">
            <div className="text-xs uppercase font-bold text-amber-400" style={{ letterSpacing: "0.2em" }}>Career Complete</div>
            <p className="text-xs text-neutral-400 mt-1">Six seasons done, {careerSeasonLabel(1)} through {careerSeasonLabel(CAREER_SEASONS)}. That's the end of the road for this XI — time to build a new one.</p>
          </div>
          <button onClick={onReset} className="w-full px-6 py-3 rounded-md font-bold uppercase tracking-wide text-sm transition fmweb-cta" style={{ background: "#059669", color: "#fff" }}>
            Start a New Game
          </button>
        </div>
      )}
    </div>
  );
}

/* ============================== Transfer Window ============================== */
function TransferCandidate({ entry, index, assignments, onSignBench, onSignXI }) {
  const { player, signed } = entry;
  const [picking, setPicking] = useState(false);
  const matchingSlots = assignments.filter((a) => a.type === player.slot);
  const slotChoices = matchingSlots.length > 0 ? matchingSlots : assignments;

  return (
    <div className={`fmweb-panel rounded-md p-3 ${signed ? "opacity-50" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-bold text-neutral-100 text-sm truncate">{player.name}</div>
          <div className="text-xs text-neutral-500 uppercase tracking-wide">{player.slot}{player.side ? ` · ${player.side}` : ""} · {player.nat} · Age {player.age || "—"}</div>
        </div>
        <div className="flex items-center justify-center rounded-full border-2 border-dashed border-neutral-600 text-neutral-500 w-7 h-7 text-xs font-black">?</div>
      </div>
      <div className="grid grid-cols-3 gap-1 mt-2">
        {STAT_KEYS.map((k) => <StatPip key={k} label={STAT_LABELS[k]} value={player.stats[k]} />)}
      </div>
      {!signed ? (
        <div className="mt-3">
          {!picking ? (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={() => onSignBench(index)} style={{ flex: "1 1 0%" }} className="px-2 py-1.5 rounded-md text-xs font-bold border border-neutral-700 text-neutral-200 hover:border-emerald-500 transition">Sign to Bench</button>
              <button onClick={() => setPicking(true)} style={{ flex: "1 1 0%", background: "#059669", color: "#fff" }} className="px-2 py-1.5 rounded-md text-xs font-bold transition fmweb-cta">Sign to XI</button>
            </div>
          ) : (
            <div>
              <div className="text-xs text-neutral-400 mb-1">Replace which player?</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {slotChoices.map((a) => (
                  <button key={a.slotId} onClick={() => onSignXI(index, a.slotId)} style={{ minWidth: 0 }}
                    className="px-2 py-1 rounded-md text-xs font-bold border border-neutral-700 text-neutral-200 hover:border-emerald-500 transition">
                    {a.player ? a.player.name.split(" ").slice(-1)[0] : a.type} <span className="text-neutral-500">({a.type})</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setPicking(false)} className="mt-2 text-xs text-neutral-500 hover:text-neutral-300 transition">Cancel</button>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-2 text-xs font-bold text-emerald-500 uppercase tracking-wide">Signed</div>
      )}
    </div>
  );
}

function TransferScreen({ shortlist, assignments, season, lastTransition, onSignBench, onSignXI, onContinue }) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-4">
        <div className="text-xs uppercase font-bold text-amber-400" style={{ letterSpacing: "0.2em" }}>Transfer Window</div>
        <h2 className="text-lg font-black text-white">Season {season + 1} · {careerSeasonLabel(season + 1)}</h2>
        <p className="text-sm text-neutral-400 mt-1">Five players have become available. Sign any of them into your bench or straight into the XI in place of someone already there — or skip the window and carry your squad forward as-is.</p>
      </div>

      {lastTransition && lastTransition.relegated.length > 0 && (
        <div className="fmweb-panel rounded-md p-4 mb-4">
          <div className="text-xs uppercase font-bold text-rose-400 mb-1" style={{ letterSpacing: "0.15em" }}>League Changes</div>
          <p className="text-sm text-neutral-300">
            <span className="text-rose-400 font-bold">Relegated to the Championship:</span> {lastTransition.relegated.join(", ")}
          </p>
          <p className="text-sm text-neutral-300 mt-1">
            <span className="text-emerald-400 font-bold">Promoted up to replace them:</span> {lastTransition.promoted.join(", ")}
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
        {shortlist.map((entry, i) => (
          <div key={entry.player.id} style={{ flex: "1 1 260px", minWidth: 0 }}>
            <TransferCandidate entry={entry} index={i} assignments={assignments} onSignBench={onSignBench} onSignXI={onSignXI} />
          </div>
        ))}
      </div>
      <button onClick={onContinue} className="w-full mt-5 px-6 py-3 rounded-md font-bold uppercase tracking-wide text-sm transition fmweb-cta" style={{ background: "#059669", color: "#fff" }}>
        Continue to Season {season + 1} →
      </button>
    </div>
  );
}

/* ============================== Ratings Reveal ================================ */
function RatingsRevealScreen({ assignments, season, onKickoff, instant }) {
  const starters = useMemo(() => assignments.filter((a) => a.player).map((a) => a.player).sort((a, b) => a.ov - b.ov), [assignments]);
  const [revealed, setRevealed] = useState(instant ? starters.length : 0);

  useEffect(() => {
    if (revealed >= starters.length) return;
    const t = setTimeout(() => setRevealed((r) => r + 1), 240);
    return () => clearTimeout(t);
  }, [revealed, starters.length]);

  const done = revealed >= starters.length;
  const avgOv = Math.round(starters.reduce((s, p) => s + p.ov, 0) / Math.max(1, starters.length));

  return (
    <div className="max-w-md mx-auto text-center">
      <div className="text-xs uppercase font-bold text-amber-400" style={{ letterSpacing: "0.2em" }}>Season {season} · {careerSeasonLabel(season)}</div>
      <h2 className="text-lg font-black text-white mb-1">Squad Ratings Revealed</h2>
      <p className="text-xs text-neutral-500 mb-4">Kept hidden through the draft and tactics board — here's what you actually assembled.</p>
      <div className="space-y-1.5">
        {starters.map((p, i) => {
          const shown = i < revealed;
          return (
            <div key={p.id} className="fmweb-panel rounded-md px-3 py-2 flex items-center justify-between"
              style={{
                opacity: shown ? 1 : 0,
                transform: shown ? "translateY(0) scale(1)" : "translateY(8px) scale(0.96)",
                transition: "opacity 0.35s ease, transform 0.35s ease",
              }}>
              <span className="text-sm font-bold text-neutral-100 truncate">{p.name}</span>
              {shown && <OvBadge ov={p.ov} size="sm" />}
            </div>
          );
        })}
      </div>
      {done && (
        <div className="fmweb-panel rounded-md p-4 mt-4" style={{ animation: "fmweb-fade-in 0.4s ease-out" }}>
          <div className="text-xs uppercase text-neutral-500 font-bold" style={{ letterSpacing: "0.15em" }}>Squad Average</div>
          <div className="text-3xl font-black text-emerald-400">{avgOv}</div>
        </div>
      )}
      {done && (
        <button onClick={onKickoff} className="w-full mt-4 px-6 py-3 rounded-md font-bold uppercase tracking-wide text-sm transition fmweb-cta" style={{ background: "#059669", color: "#fff" }}>
          Kick Off Season {season} →
        </button>
      )}
    </div>
  );
}

/* =================================== App ==================================== */
export default function FMWeb({ dataset, storage: storageProp }) {
  const [storage] = useState(() => (storageProp !== undefined ? storageProp : getStorage()));
  const [boot] = useState(() => (storage ? readAutosave(storage) : { status: "none" }));
  const reducer = useMemo(() => createReducer(dataset), [dataset]);
  const [state, dispatch] = useReducer(reducer, dataset, (ds) => makeInitialState(ds, newCareerSeed()));
  const [pendingSave, setPendingSave] = useState(boot.status === "ok" ? boot.save : null);
  const [notice, setNotice] = useState(boot.status === "corrupt" ? "corrupt" : storage ? null : "unavailable");
  const [resumed, setResumed] = useState(false);
  const shownPhase = useRef(state.phase);
  const persistRequested = useRef(false);

  useAutosave({ state, storage, enabled: !pendingSave, onWriteError: () => setNotice("unavailable") });

  useEffect(() => {
    if (shownPhase.current !== state.phase) {
      shownPhase.current = state.phase;
      setResumed(false);
    }
  }, [state.phase]);

  const loadCareer = (loaded) => {
    shownPhase.current = loaded.phase;
    setPendingSave(null);
    setResumed(true);
    dispatch({ type: "LOAD_SAVE", state: loaded });
  };

  const confirmReplaceSave = () => {
    if (!pendingSave) return true;
    const { season, seasonLabel } = describeSave(pendingSave);
    if (!window.confirm(`Start a new career? Your saved career (Season ${season} · ${seasonLabel}) will be replaced.`)) return false;
    clearAutosave(storage);
    setPendingSave(null);
    return true;
  };

  const startDraft = () => {
    if (!confirmReplaceSave()) return;
    if (!persistRequested.current) {
      persistRequested.current = true;
      requestPersistentStorage();
    }
    dispatch({ type: "START_DRAFT" });
  };

  const newGame = () => {
    if (!window.confirm("Start a new career? Your current career will be replaced.")) return;
    clearAutosave(storage);
    setResumed(false);
    dispatch({ type: "NEW_GAME", seed: newCareerSeed() });
  };

  const exportCareer = () => {
    exportSaveText(toSaveText(makeSaveEnvelope(state, { gameVersion: APP_VERSION })), saveFileName(state));
  };

  const importCareer = async (file) => {
    const result = await readImportFile(file);
    if (!result.ok) return result;
    const hasCareer = state.phase !== "formation" || pendingSave;
    const currentSeason = pendingSave ? pendingSave.state.season : state.season;
    if (hasCareer && !window.confirm(`Replace your current career (Season ${currentSeason})?`)) return { ok: false };
    const loaded = hydrateState(result.save.state);
    if (storage) writeAutosave(storage, toSaveText(makeSaveEnvelope(loaded, { gameVersion: APP_VERSION })));
    loadCareer(loaded);
    const { season, seasonLabel } = describeSave(result.save);
    return { ok: true, message: `Loaded Season ${season} · ${seasonLabel}.` };
  };
  const { phase, formationKey, assignments, bench, draftedIds, wheel, pool, instructions } = state;
  const [activeSlotId, setActiveSlotId] = useState(null);
  const [dragInfo, setDragInfo] = useState(null); // { kind: 'slot'|'bench', id }

  // Global pointer-up coordinator for the pitch/bench drag system. Using
  // pointer events (rather than HTML5 drag-and-drop) means this works with
  // touch on mobile too. On release we hit-test whatever DOM element is under
  // the pointer: land on another player -> swap identities; land on open
  // pitch space -> move that player to the exact drop point; land on the
  // bench -> swap on/off the pitch.
  useEffect(() => {
    if (!dragInfo) return;
    function onUp(e) {
      const point = e.changedTouches ? e.changedTouches[0] : e;
      const el = document.elementFromPoint(point.clientX, point.clientY);
      if (el) {
        const slotEl = el.closest("[data-slot-id]");
        const benchEl = el.closest("[data-bench-idx]");
        const pitchZone = el.closest('[data-drop-zone="pitch"]');
        if (slotEl) {
          const toId = slotEl.getAttribute("data-slot-id");
          if (!(dragInfo.kind === "slot" && dragInfo.id === toId)) {
            dispatch({ type: "SWAP_PLAYERS", fromKind: dragInfo.kind, fromId: dragInfo.id, toKind: "slot", toId });
          }
        } else if (benchEl) {
          const toId = Number(benchEl.getAttribute("data-bench-idx"));
          dispatch({ type: "SWAP_PLAYERS", fromKind: dragInfo.kind, fromId: dragInfo.id, toKind: "bench", toId });
        } else if (pitchZone) {
          const rect = pitchZone.getBoundingClientRect();
          const x = ((point.clientX - rect.left) / rect.width) * 100;
          const y = ((point.clientY - rect.top) / rect.height) * 100;
          if (dragInfo.kind === "slot") {
            dispatch({ type: "MOVE_PLAYER", slotId: dragInfo.id, x, y });
          } else {
            // bench player dropped on open pitch space -> swap into the nearest slot
            let nearest = null, nearestDist = Infinity;
            assignments.forEach((a) => {
              const d = Math.hypot(a.pos.x - x, a.pos.y - y);
              if (d < nearestDist) { nearestDist = d; nearest = a.slotId; }
            });
            if (nearest) dispatch({ type: "SWAP_PLAYERS", fromKind: "bench", fromId: dragInfo.id, toKind: "slot", toId: nearest });
          }
        }
      }
      setDragInfo(null);
    }
    window.addEventListener("pointerup", onUp);
    window.addEventListener("touchend", onUp);
    return () => { window.removeEventListener("pointerup", onUp); window.removeEventListener("touchend", onUp); };
  }, [dragInfo, assignments]);

  const nextIdx = nextEmptySlotIndex(assignments);
  const draftTargetSlotId = nextIdx >= 0 ? assignments[nextIdx].slotId : null;
  const draftTargetLabel = nextIdx >= 0 ? SLOT_TYPE_LABEL[assignments[nextIdx].type] : "";
  const draftComplete = nextIdx === -1;

  const live = useMemo(() => liveAssignments(assignments), [assignments]);
  const familiarity = useMemo(() => selectFamiliarity(live, instructions, formationKey), [live, instructions, formationKey]);
  const profile = useMemo(() => selectProfile(live, instructions, familiarity), [live, instructions, familiarity]);
  const eraIndex = useMemo(() => selectEraIndex(dataset.index, state.eraMin, state.eraMax), [dataset, state.eraMin, state.eraMax]);

  const activeAssignment = assignments.find((a) => a.slotId === activeSlotId);

  return (
    <>
      <style>{`
        .fmweb-root, .fmweb-root *, .fmweb-root *::before, .fmweb-root *::after {
          box-sizing: border-box;
        }
        .fmweb-root button {
          min-width: 0;
        }
        .fmweb-root p, .fmweb-root span, .fmweb-root div, .fmweb-root button {
          overflow-wrap: break-word;
          word-break: normal;
        }
        .fmweb-root img, .fmweb-root svg {
          max-width: 100%;
        }
        .fmweb-root {
          scroll-behavior: smooth;
        }
        .fmweb-root ::selection {
          background: rgba(16, 185, 129, 0.3);
          color: #f5f5f4;
        }
        .fmweb-root ::-webkit-scrollbar {
          width: 9px;
          height: 9px;
        }
        .fmweb-root ::-webkit-scrollbar-track {
          background: #0a0f0c;
        }
        .fmweb-root ::-webkit-scrollbar-thumb {
          background: #2a3330;
          border-radius: 999px;
          border: 2px solid #0a0f0c;
        }
        .fmweb-root ::-webkit-scrollbar-thumb:hover {
          background: #3a453f;
        }
        .fmweb-root button, .fmweb-root a, .fmweb-root [role="button"] {
          transition: filter 0.12s ease, box-shadow 0.15s ease, border-color 0.15s ease, background-color 0.15s ease, opacity 0.15s ease;
        }
        .fmweb-root button:active {
          filter: brightness(0.92);
        }
        @keyframes fmweb-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fmweb-phase {
          animation: fmweb-fade-in 0.32s ease-out;
        }
        .fmweb-cta {
          box-shadow: 0 1px 0 0 rgba(255,255,255,0.15) inset, 0 2px 8px rgba(0,0,0,0.45);
        }
        .fmweb-cta:hover {
          filter: brightness(1.08);
        }
        .fmweb-panel {
          background: linear-gradient(180deg, #121815 0%, #0d1310 100%);
          border: 1px solid #242e29;
          box-shadow: 0 1px 0 0 rgba(255,255,255,0.03) inset, 0 8px 20px -8px rgba(0,0,0,0.6);
        }
      `}</style>
      <div className="fmweb-root min-h-screen w-full text-neutral-100" style={{
        fontFamily: "'Inter', ui-sans-serif, system-ui",
        background: "linear-gradient(180deg, #0c1310 0%, #090d0b 55%, #07100c 100%)",
      }}>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <header className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div style={{ width: "3px", height: "36px", background: "#c9a227" }} />
            <div>
              <div className="text-xs uppercase font-bold text-amber-500" style={{ letterSpacing: "0.3em" }}>Premier League · 1992 – 2025</div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">FM<span className="text-emerald-500">.WEB</span></h1>
              <div className="text-xs text-neutral-500 font-semibold -mt-0.5 uppercase tracking-wide">Football Manager, in your browser</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center text-xs uppercase font-bold tracking-wide">
              {state.season === 1 && phase !== "transfer" && phase !== "reveal" ? (
                ["formation", "draft", "tactics", "result"].map((p, i) => {
                  const order = ["formation", "draft", "tactics", "result"];
                  const currentIdx = order.indexOf(phase);
                  const thisIdx = order.indexOf(p);
                  const done = thisIdx < currentIdx;
                  const active = thisIdx === currentIdx;
                  return (
                    <div key={p} className="flex items-center">
                      {i > 0 && <div className={`w-4 h-px ${done || active ? "bg-emerald-600" : "bg-neutral-800"}`} />}
                      <div className={`px-2.5 py-1 rounded border ${active ? "bg-emerald-600 text-white border-emerald-600" : done ? "border-emerald-800 text-emerald-600" : "border-neutral-800 text-neutral-600"}`}>{p}</div>
                    </div>
                  );
                })
              ) : (
                <div className="px-3 py-1.5 rounded border border-emerald-800 text-emerald-500">
                  Season {state.season} · {careerSeasonLabel(state.season)}{phase === "transfer" ? " · Transfer Window" : phase === "reveal" ? " · Squad Reveal" : ""}
                </div>
              )}
            </div>
            <SaveMenu canExport={phase !== "formation"} onExport={exportCareer} onImportFile={importCareer} version={APP_VERSION} />
          </div>
        </header>

        {notice && <StorageBanner kind={notice} onDismiss={() => setNotice(null)} />}
        {phase === "formation" && pendingSave && (
          <ResumeCard summary={describeSave(pendingSave)} onContinue={() => loadCareer(hydrateState(pendingSave.state))} onNewGame={confirmReplaceSave} />
        )}

        <div key={phase} className="fmweb-phase">
        {phase === "formation" && (
          <FormationSelect formationKey={formationKey} onPick={(k) => dispatch({ type: "SET_FORMATION", key: k })}
            onStart={startDraft} assignments={assignments}
            eraMin={state.eraMin} eraMax={state.eraMax} onSetEra={(mn, mx) => dispatch({ type: "SET_ERA", min: mn, max: mx })} />
        )}

        {phase === "draft" && (
          <DraftScreen formationKey={formationKey} assignments={assignments} bench={bench} wheel={wheel} pool={pool}
            draftTargetSlotId={draftTargetSlotId} draftTargetLabel={draftTargetLabel} draftComplete={draftComplete}
            eraMin={state.eraMin} eraMax={state.eraMax} eraIndex={eraIndex}
            onSpin={() => dispatch({ type: "SPIN" })}
            onDoneSpin={() => dispatch({ type: "LAND" })}
            onPick={(p) => dispatch({ type: "PICK_PLAYER", player: p })}
            onGotoTactics={() => dispatch({ type: "SKIP_TO_TACTICS" })}
          />
        )}

        {phase === "tactics" && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "flex-start", width: "100%" }}>
            <div style={{ flex: "1 1 260px", minWidth: 0, maxWidth: "100%", boxSizing: "border-box" }} className="space-y-3">
              <Pitch assignments={assignments} activeSlotId={activeSlotId} mode="tactics" dragHint
                onSlotClick={(id) => setActiveSlotId(id === activeSlotId ? null : id)}
                onDragStart={(kind, id) => setDragInfo({ kind, id })}
                draggingId={dragInfo?.kind === "slot" ? dragInfo.id : null} />
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <p className="text-xs text-neutral-500" style={{ flex: "1 1 auto", minWidth: 0 }}>Drag any player anywhere on the pitch to reposition, or drop him on a teammate to swap. Tap to edit role, duty, and sliders.</p>
                <button onClick={() => dispatch({ type: "RESET_POSITIONS" })} style={{ flexShrink: 0 }} className="text-xs px-2 py-1 h-fit rounded-md border border-neutral-700 text-neutral-300 hover:border-emerald-500 transition">Reset shape</button>
              </div>
              <BenchStrip bench={bench} draggable
                onDragStart={(kind, id) => setDragInfo({ kind, id })}
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
        )}

        {phase === "transfer" && (
          <TransferScreen shortlist={state.shortlist} assignments={assignments} season={state.season} lastTransition={state.lastTransition}
            onSignBench={(index) => dispatch({ type: "SIGN_SHORTLIST_TO_BENCH", index })}
            onSignXI={(index, slotId) => dispatch({ type: "SIGN_SHORTLIST_TO_XI", index, slotId })}
            onContinue={() => dispatch({ type: "CONTINUE_SEASON" })} />
        )}

        {phase === "reveal" && state.simulation && (
          <RatingsRevealScreen assignments={assignments} season={state.season} onKickoff={() => dispatch({ type: "KICKOFF" })} instant={resumed} />
        )}

        {phase === "result" && state.simulation && (
          <ResultCard simulation={state.simulation} formationKey={formationKey} assignments={assignments}
            onReset={newGame} onContinue={() => dispatch({ type: "GOTO_TRANSFER" })} instant={resumed} />
        )}
        </div>
      </div>
      </div>
    </>
  );
}
