import styles from "./PitchLines.module.css";

// Chalk pitch markings on a 0–100 × 0–100 board whose box is 68:100, so the
// ellipses below come out circular (same proportions as the v1 markings).
const PEN_W = 59.3, PEN_D = 16.5;
const SIX_W = 26.9, SIX_D = 5.5;
const GOAL_W = 10.76;
const CIRC_RX = 13.46, CIRC_RY = 9.15;
const SPOT_Y = 11;
const ARC_BULGE = 3.65;

export default function PitchLines() {
  const arc = (fromTop) => {
    const spotY = fromTop ? SPOT_Y : 100 - SPOT_Y;
    const clipTop = fromTop ? PEN_D : 100 - PEN_D - ARC_BULGE;
    return (
      <g clipPath={`inset(${clipTop}% 0 ${100 - clipTop - ARC_BULGE}% 0)`} style={{ clipPath: `inset(${clipTop}% 0 ${100 - clipTop - ARC_BULGE}% 0)` }}>
        <ellipse cx="50" cy={spotY} rx={CIRC_RX} ry={CIRC_RY} />
      </g>
    );
  };
  return (
    <svg className={styles.lines} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <rect x="2" y="2" width="96" height="96" />
      <line x1="2" y1="50" x2="98" y2="50" />
      <ellipse cx="50" cy="50" rx={CIRC_RX} ry={CIRC_RY} />
      <circle cx="50" cy="50" r="0.6" className={styles.spot} />
      <rect x={50 - PEN_W / 2} y="2" width={PEN_W} height={PEN_D} />
      <rect x={50 - PEN_W / 2} y={98 - PEN_D} width={PEN_W} height={PEN_D} />
      <rect x={50 - SIX_W / 2} y="2" width={SIX_W} height={SIX_D} />
      <rect x={50 - SIX_W / 2} y={98 - SIX_D} width={SIX_W} height={SIX_D} />
      <circle cx="50" cy={SPOT_Y + 2} r="0.6" className={styles.spot} />
      <circle cx="50" cy={98 - SPOT_Y} r="0.6" className={styles.spot} />
      {arc(true)}
      {arc(false)}
      <line x1={50 - GOAL_W / 2} y1="2" x2={50 + GOAL_W / 2} y2="2" className={styles.goal} />
      <line x1={50 - GOAL_W / 2} y1="98" x2={50 + GOAL_W / 2} y2="98" className={styles.goal} />
    </svg>
  );
}
