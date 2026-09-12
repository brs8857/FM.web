/* Proportionally-accurate pitch markings, derived from a real 68m x 100m
   pitch mapped onto our 0-100 x / 0-100 y coordinate system (the container's
   aspect ratio is set so 1% of x and 1% of y represent the same real-world
   distance, which is what keeps the center circle actually circular). */
export default function PitchMarkings() {
  const PEN_W = 59.3, PEN_D = 16.5;     // 18-yard box: 40.32m x 16.5m
  const SIX_W = 26.9, SIX_D = 5.5;      // 6-yard box: 18.32m x 5.5m
  const GOAL_W = 10.76;                 // goal mouth: 7.32m
  const CIRC_RX = 13.46, CIRC_RY = 9.15; // center circle radius: 9.15m
  const SPOT_Y = 11;                    // penalty spot: 11m from goal line
  const ARC_BULGE = 3.65;               // how far the "D" bulges past the box
  const lineCls = "absolute border-white/25";

  const Box = (w, d, fromTop) => (
    <div className={`${lineCls} border-2`} style={{
      left: `${50 - w / 2}%`, width: `${w}%`,
      ...(fromTop ? { top: 0, borderTop: "none" } : { bottom: 0, borderBottom: "none" }),
      height: `${d}%`,
    }} />
  );

  const Spot = (y) => (
    <div className="absolute w-1 h-1 rounded-full bg-white/40 -translate-x-1/2 -translate-y-1/2" style={{ left: "50%", top: `${y}%` }} />
  );

  const GoalMouth = (fromTop) => (
    <div className="absolute bg-white/40" style={{
      left: `${50 - GOAL_W / 2}%`, width: `${GOAL_W}%`, height: "3px",
      ...(fromTop ? { top: 0 } : { bottom: 0 }),
    }} />
  );

  // The "D": a full ring centered on the penalty spot, clipped by a thin
  // overflow-hidden band so only the bulge beyond the box edge is visible.
  const Arc = (fromTop) => {
    const bandStart = fromTop ? PEN_D : 100 - PEN_D - ARC_BULGE;
    const topInset = bandStart;
    const bottomInset = 100 - bandStart - ARC_BULGE;
    const spotY = fromTop ? SPOT_Y : 100 - SPOT_Y;
    return (
      <div className="absolute inset-0" style={{ clipPath: `inset(${topInset}% 0% ${bottomInset}% 0%)` }}>
        <div className="absolute rounded-full border-2 border-white/25" style={{
          left: "50%", top: `${spotY}%`, width: `${CIRC_RX * 2}%`, height: `${CIRC_RY * 2}%`,
          transform: "translate(-50%, -50%)",
        }} />
      </div>
    );
  };

  const Corner = (left, top) => (
    <div className="absolute rounded-full border-2 border-white/25" style={{
      left: `${left}%`, top: `${top}%`, width: "3%", height: "2%", transform: "translate(-50%, -50%)",
    }} />
  );

  return (
    <>
      {/* outer touchlines */}
      <div className="absolute inset-2 border-2 border-white/25" />
      {/* halfway line */}
      <div className="absolute left-1/2 top-1/2 w-full h-px bg-white/25 -translate-x-1/2 -translate-y-1/2" />
      {/* center circle + spot */}
      <div className="absolute rounded-full border-2 border-white/25 -translate-x-1/2 -translate-y-1/2"
        style={{ left: "50%", top: "50%", width: `${CIRC_RX * 2}%`, height: `${CIRC_RY * 2}%` }} />
      {Spot(50)}
      {/* 18-yard boxes */}
      {Box(PEN_W, PEN_D, true)}
      {Box(PEN_W, PEN_D, false)}
      {/* 6-yard boxes */}
      {Box(SIX_W, SIX_D, true)}
      {Box(SIX_W, SIX_D, false)}
      {/* penalty spots + arcs */}
      {Spot(SPOT_Y)}
      {Spot(100 - SPOT_Y)}
      {Arc(true)}
      {Arc(false)}
      {/* goal mouths */}
      {GoalMouth(true)}
      {GoalMouth(false)}
      {/* corner arcs */}
      {Corner(0, 0)}
      {Corner(100, 0)}
      {Corner(0, 100)}
      {Corner(100, 100)}
    </>
  );
}
