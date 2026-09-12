import { mentalityLabel } from "../../engine/readout.js";
import Slider from "../ui/Slider.jsx";

export default function InstructionsPanel({ instructions, onSet }) {
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
