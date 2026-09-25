import { cx } from "./cx.js";
import styles from "./Ticker.module.css";

// The vidiprinter: a monospaced feed, newest line at the bottom, the latest
// line typing in block by block. It only announces when `announce` is on
// (paused or at the half-season slip), never per tick.
export default function Ticker({ lines, label = "Vidiprinter", announce = false, cursor = false, maxLines }) {
  const shown = maxLines ? lines.slice(-maxLines) : lines;
  return (
    <div role="log" aria-label={label} aria-live={announce ? "polite" : "off"} className={styles.ticker}>
      <ol className={styles.lines}>
        {shown.map((entry, i) => {
          const line = typeof entry === "string" ? { text: entry } : entry;
          const latest = i === shown.length - 1;
          return (
            <li key={line.id ?? `${i}-${line.text}`} className={cx(styles.line, line.tone && styles[line.tone], latest && "type")}
              style={latest ? { "--type-blocks": Math.max(1, Math.ceil(line.text.length / 2)) } : undefined}>
              {line.text}
            </li>
          );
        })}
      </ol>
      {cursor && <span className={styles.cursor} aria-hidden="true">█</span>}
    </div>
  );
}
