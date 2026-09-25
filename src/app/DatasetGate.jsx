import { useEffect, useState } from "react";
import Button from "../ui/Button.jsx";
import styles from "./Screens.module.css";

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
      <div className={styles.screen} role="alert">
        <p className={styles.text}>Couldn't load player data. Check your connection.</p>
        <Button onClick={() => setAttempt((a) => a + 1)}>Retry</Button>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <p role="status" className={styles.text}>Loading player data…</p>
    </div>
  );
}
