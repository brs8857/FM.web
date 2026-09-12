import { Component } from "react";
import { APP_VERSION } from "../../version.js";
import { SAVE_KEY, CORRUPT_KEY, getStorage } from "../../state/storage.js";
import { exportSaveText } from "../../state/exportImport.js";

const BUTTON = "px-4 py-2.5 rounded-md text-xs font-bold uppercase tracking-wide transition";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("FM.WEB crashed", error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const storage = this.props.storage !== undefined ? this.props.storage : getStorage();
    const reload = this.props.reload ?? (() => window.location.reload());
    const exportFn = this.props.exportFn ?? exportSaveText;
    const rawSave = storage ? storage.getItem(SAVE_KEY) : null;

    let careerSeed = "unknown";
    try {
      careerSeed = String(JSON.parse(rawSave).state.careerSeed ?? "unknown");
    } catch {
      // No readable save; the seed stays unknown.
    }

    const startNewGame = () => {
      if (storage && rawSave !== null) {
        try {
          storage.setItem(CORRUPT_KEY, rawSave);
          storage.removeItem(SAVE_KEY);
        } catch {
          // Storage blocked or full; reloading still gives the player a way out.
        }
      }
      reload();
    };

    return (
      <div role="alert" className="min-h-screen w-full flex items-center justify-center px-6 text-neutral-200"
        style={{ background: "linear-gradient(180deg, #0c1310 0%, #090d0b 55%, #07100c 100%)" }}>
        <div className="fmweb-panel rounded-md p-6 max-w-md w-full space-y-3">
          <h1 className="text-lg font-black text-white">Something went wrong</h1>
          <p className="text-sm text-neutral-400 break-words">{String(error.message || error)}</p>
          <p className="text-xs text-neutral-500 font-mono">Version {APP_VERSION} · Career seed {careerSeed}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            <button type="button" onClick={reload} className={`${BUTTON} text-white`} style={{ background: "#059669" }}>Reload</button>
            {rawSave !== null && (
              <button type="button" onClick={() => exportFn(rawSave, "fmweb-save.json")}
                className={`${BUTTON} border border-neutral-700 text-neutral-200 hover:border-emerald-500`}>
                Export save
              </button>
            )}
            <button type="button" onClick={startNewGame}
              className={`${BUTTON} border border-neutral-700 text-neutral-300 hover:border-rose-400`}>
              Start new game
            </button>
          </div>
        </div>
      </div>
    );
  }
}
