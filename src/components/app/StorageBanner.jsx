const MESSAGES = {
  unavailable: "Saving isn't available in this browser. Use Export to keep your career.",
  corrupt: "Your saved career couldn't be loaded, so a new game has started. The damaged save was kept aside.",
};

export default function StorageBanner({ kind, onDismiss }) {
  return (
    <div role="status" className="mb-4 flex items-start justify-between gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
      <p>{MESSAGES[kind]}</p>
      <button type="button" onClick={onDismiss} aria-label="Dismiss" className="shrink-0 font-bold text-amber-300 hover:text-amber-100">✕</button>
    </div>
  );
}
