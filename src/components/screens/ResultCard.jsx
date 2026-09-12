import { useEffect, useRef, useState } from "react";
import { FORMATIONS } from "../../engine/formations.js";
import { CAREER_SEASONS, careerSeasonLabel } from "../../engine/season.js";
import TacticsSummary from "./TacticsSummary.jsx";

/* ================================ Result screen ============================= */
export default function ResultCard({ simulation, formationKey, assignments, onReset, onContinue, instant }) {
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
          <p className="text-xs text-neutral-500 mb-2">
            {season === 1
              ? "The real 19 top-flight rivals, with your XI taking Fulham's place."
              : "This season's 19 Premier League clubs alongside your XI."}
            {" "}Rivals' points are estimated from squad strength; yours are your actual simulated results.
          </p>
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
