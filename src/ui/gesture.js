// The arithmetic behind a gesture that is handed from the finger to a
// spring (Apple's "Designing Fluid Interfaces"): where a flick is going,
// how hard to resist at an edge, and whether to commit or come back.

export const DECELERATION = 0.998;

// Where a flick at `velocity` (px/s) would come to rest, as scrolling does.
export function project(velocity, rate = DECELERATION) {
  return ((velocity / 1000) * rate) / (1 - rate);
}

// Progressive resistance past an edge: the further out, the less it follows.
export function rubberband(overshoot, dimension, constant = 0.55) {
  if (overshoot === 0) return 0;
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

// px/s from the (y, t) samples of a drag, counting only the last `windowMs`
// before the finger lifted at `now`. A held finger sends no moves, so the
// window runs to the release, not to the last move: a fast pull followed by a
// pause reads as no velocity at all.
export function releaseVelocity(samples, now, windowMs = 100) {
  const recent = samples.filter((s) => now - s.t <= windowMs);
  if (recent.length < 2) return 0;
  const first = recent[0], last = recent[recent.length - 1];
  if (last.t === first.t) return 0;
  return ((last.y - first.y) / (last.t - first.t)) * 1000;
}

// A sheet dragged down by `offset` px and let go at `velocity` px/s is
// dismissed if where it was heading, not where it is, is far enough, and it
// was not on its way back up.
export function shouldDismiss({ offset, velocity, height }) {
  if (velocity < -150) return false;
  return offset + project(velocity) > Math.min(height * 0.4, 120);
}

// How long the exit takes: the rest of the way at the speed the finger had,
// never slower than a calm slide or snappier than a flick.
export function exitDuration({ remaining, velocity, min = 140, max = 320 }) {
  const speed = Math.max(Math.abs(velocity), 900);
  return Math.round(Math.min(max, Math.max(min, (remaining / speed) * 1000)));
}
