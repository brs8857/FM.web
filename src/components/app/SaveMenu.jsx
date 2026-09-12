import { useRef, useState } from "react";

const ITEM = "w-full text-left px-2 py-1.5 rounded text-xs font-bold text-neutral-200 hover:bg-neutral-800 disabled:text-neutral-600 disabled:hover:bg-transparent";

export default function SaveMenu({ canExport, onExport, onImportFile, version }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(null);
  const fileInput = useRef(null);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const result = await onImportFile(file);
    if (result.ok) {
      setOpen(false);
      setMessage(result.message ?? null);
    } else if (result.reason) {
      setMessage(result.reason);
    }
  };

  return (
    <div className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className="px-3 py-1.5 rounded border border-neutral-700 text-xs font-bold uppercase tracking-wide text-neutral-300 hover:border-emerald-500">
        Menu
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-2 w-56 z-40 fmweb-panel rounded-md p-2 space-y-1">
          <button type="button" role="menuitem" className={ITEM} disabled={!canExport}
            onClick={() => { setOpen(false); onExport(); }}>
            Export save
          </button>
          <button type="button" role="menuitem" className={ITEM} onClick={() => fileInput.current?.click()}>
            Import save
          </button>
          <p className="px-2 pt-1 text-xs text-neutral-500">FM.WEB v{version}</p>
        </div>
      )}
      <input ref={fileInput} type="file" accept=".json,application/json" className="hidden"
        data-testid="import-save-input" aria-label="Import save file" onChange={handleFile} />
      {message && (
        <p role="status" className="absolute right-0 top-full mt-2 w-64 z-30 fmweb-panel rounded-md p-2 text-xs text-neutral-200"
          onClick={() => setMessage(null)}>
          {message}
        </p>
      )}
    </div>
  );
}
