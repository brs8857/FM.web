import styles from "./Meter.module.css";

export default function Meter({ label, value, valueLabel, min = 0, max = 100, showValue = false }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className={styles.meter}>
      <div className={styles.head}>
        <span className={styles.label}>{label}</span>
        <span className={styles.word}>{valueLabel}{showValue && <span className="mono"> {value}</span>}</span>
      </div>
      <div role="meter" aria-label={label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value}
        aria-valuetext={valueLabel ? `${valueLabel}, ${value} of ${max}` : `${value} of ${max}`} className={styles.track}>
        <span className={styles.fill} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
