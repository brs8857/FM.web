import IconButton from "./IconButton.jsx";
import { BackIcon } from "./icons.jsx";
import styles from "./TopBar.module.css";

export default function TopBar({ title, subtitle, onBack, backLabel = "Back", start, end, next }) {
  return (
    <header className={styles.bar}>
      <div className={styles.start}>
        {onBack && <IconButton label={backLabel} onClick={onBack}><BackIcon /></IconButton>}
        {start}
      </div>
      <div className={styles.titles}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      <div className={styles.end}>
        {next}
        {end}
      </div>
    </header>
  );
}
