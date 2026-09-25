import { Component } from "react";
import { APP_VERSION } from "../version.js";
import { SAVE_KEY, CORRUPT_KEY, getStorage } from "../state/storage.js";
import { exportSaveText } from "../state/exportImport.js";
import { EXPORT_PREFIX, PRODUCT_NAME } from "../content/product.js";
import Button from "../ui/Button.jsx";
import styles from "./Screens.module.css";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error(`${PRODUCT_NAME} crashed`, error, info?.componentStack);
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
      <div role="alert" className={styles.screen}>
        <div className={styles.panel}>
          <h1 className={styles.title}>Something went wrong</h1>
          <p className={styles.text}>{String(error.message || error)}</p>
          <p className={`${styles.meta} mono`}>Version {APP_VERSION} · Career seed {careerSeed}</p>
          <div className={styles.actions}>
            <Button onClick={reload}>Reload</Button>
            {rawSave !== null && <Button variant="secondary" onClick={() => exportFn(rawSave, `${EXPORT_PREFIX}-save.json`)}>Export save</Button>}
            <Button variant="secondary" onClick={startNewGame}>Start new game</Button>
          </div>
        </div>
      </div>
    );
  }
}
