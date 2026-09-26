import { useId, useState } from "react";
import Button from "../../ui/Button.jsx";
import Toast from "../../ui/Toast.jsx";
import { Term } from "../../ui/Term.jsx";
import { CopyIcon } from "../../ui/icons.jsx";
import { decodeCareerCode } from "../../app/careerCode.js";
import styles from "./Club.module.css";

export default function CareerCode({ code, onStartFromCode }) {
  const [toast, setToast] = useState(null);
  const [entered, setEntered] = useState("");
  const [error, setError] = useState(null);
  const inputId = useId();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setToast("Career code copied");
    } catch {
      setToast("Copy the code by hand: the clipboard is blocked here");
    }
  };
  const start = (event) => {
    event.preventDefault();
    const decoded = decodeCareerCode(entered);
    if (!decoded) { setError("That doesn't look like a career code. Check the twelve characters."); return; }
    setError(null);
    onStartFromCode(decoded);
  };

  return (
    <div className={styles.section}>
      <p><Term term="career-code">Your career code</Term> is the seed, era and shape of this career. Anyone who starts from it gets the same draws.</p>
      <div className={styles.code}>
        <span className={`${styles.codeText} mono`} data-testid="career-code">{code}</span>
        <Button size="sm" variant="secondary" onClick={copy}><CopyIcon /> Copy</Button>
      </div>
      <form className={styles.section} onSubmit={start}>
        <label htmlFor={inputId} className={styles.settingLabel}>Start a career from a code</label>
        <div className={styles.row}>
          <input id={inputId} className={styles.input} value={entered} onChange={(e) => setEntered(e.target.value)} placeholder="AB-CD-EF-GH-JK-LM"
            autoComplete="off" autoCapitalize="characters" spellCheck={false} aria-invalid={error ? "true" : undefined} aria-describedby={error ? `${inputId}-error` : undefined} />
          <Button type="submit" variant="secondary" disabled={entered.trim() === ""}>Start from code</Button>
        </div>
        {error && <p id={`${inputId}-error`} className={styles.error} role="alert">{error}</p>}
      </form>
      <Toast open={Boolean(toast)} message={toast ?? ""} onClose={() => setToast(null)} />
    </div>
  );
}
