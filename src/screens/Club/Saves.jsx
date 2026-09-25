import { useRef, useState } from "react";
import Button from "../../ui/Button.jsx";
import Toast from "../../ui/Toast.jsx";
import styles from "./Club.module.css";

// Saves (spec 04 §5.7): export and import, moved here from the old menu.
export default function Saves({ canExport, storageAvailable, onExport, onImportFile }) {
  const [toast, setToast] = useState(null);
  const fileInput = useRef(null);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const result = await onImportFile(file);
    if (result.message) setToast(result.message);
  };

  return (
    <div className={styles.section}>
      <p className={styles.hint}>
        {storageAvailable
          ? "Your career saves itself on this device after every pick and every season. Export a copy to move it or keep it safe."
          : "Saving isn't available in this browser, so export your career to keep it."}
      </p>
      <div className={styles.row}>
        <Button variant="secondary" onClick={onExport} disabled={!canExport}>Export save</Button>
        <Button variant="secondary" onClick={() => fileInput.current?.click()}>Import save</Button>
      </div>
      <input ref={fileInput} type="file" accept=".json,application/json" className={styles.hiddenInput} tabIndex={-1}
        data-testid="import-save-input" aria-label="Import save file" onChange={handleFile} />
      <Toast open={Boolean(toast)} message={toast ?? ""} onClose={() => setToast(null)} />
    </div>
  );
}
