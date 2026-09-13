import { useEffect, useRef, useState } from "react";

/* ============================== Wheel Spinner ================================= */
export default function WheelSpinner({ spinning, landed, onSpin, onDone, targetLabel, pool }) {
  const [display, setDisplay] = useState("Spin to draft a club season");
  const [fading, setFading] = useState(false);
  const [justLanded, setJustLanded] = useState(false);
  const timerRef = useRef(null);
  const fadeRef = useRef(null);
  const poolRef = useRef(pool);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    poolRef.current = pool;
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    if (!spinning) return;
    let i = 0;
    const idx = poolRef.current;
    const total = 14; // fewer, faster ticks than before — a quick, confident spin rather than a long crawl
    function tick() {
      i++;
      if (i >= total) {
        // last tick — don't bother fading to another random label, the real
        // result is about to land via the `landed` prop a moment later
        onDoneRef.current();
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
