import { useEffect, useState } from "react";

const SHELL = "min-h-screen w-full flex flex-col items-center justify-center gap-3 px-6 text-center text-neutral-300";
const SHELL_BG = { background: "linear-gradient(180deg, #0c1310 0%, #090d0b 55%, #07100c 100%)" };

export default function DatasetGate({ load, children }) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ status: "loading", dataset: null });

  useEffect(() => {
    let cancelled = false;
    setResult({ status: "loading", dataset: null });
    load().then(
      (dataset) => { if (!cancelled) setResult({ status: "ready", dataset }); },
      () => { if (!cancelled) setResult({ status: "error", dataset: null }); },
    );
    return () => { cancelled = true; };
  }, [load, attempt]);

  if (result.status === "ready") return children(result.dataset);

  if (result.status === "error") {
    return (
      <div className={SHELL} style={SHELL_BG} role="alert">
        <p className="text-sm">Couldn't load player data. Check your connection.</p>
        <button type="button" onClick={() => setAttempt((a) => a + 1)}
          className="px-5 py-2.5 rounded-md font-bold uppercase tracking-wide text-xs text-white" style={{ background: "#059669" }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={SHELL} style={SHELL_BG}>
      <p role="status" className="text-sm">Loading player data…</p>
    </div>
  );
}
