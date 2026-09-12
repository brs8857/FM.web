export default function ResumeCard({ summary, onContinue, onNewGame }) {
  return (
    <section aria-label="Saved career" className="fmweb-panel rounded-md p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-xs uppercase font-bold text-amber-400" style={{ letterSpacing: "0.2em" }}>Saved career</div>
        <div className="font-black text-neutral-100">Season {summary.season} · {summary.seasonLabel} · {summary.phaseLabel}</div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onNewGame}
          className="px-4 py-2 rounded-md text-xs font-bold border border-neutral-700 text-neutral-200 hover:border-emerald-500 transition">
          New game
        </button>
        <button type="button" onClick={onContinue}
          className="px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wide text-white transition fmweb-cta" style={{ background: "#059669" }}>
          Continue career
        </button>
      </div>
    </section>
  );
}
