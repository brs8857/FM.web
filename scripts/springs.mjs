// The game's springs as CSS easing, so they cost no JavaScript. A spring is
// described the way Apple's frameworks do: a damping ratio (1 settles with
// no overshoot, below 1 overshoots) and a response in seconds (the period of
// the undamped oscillation, so lower is snappier). The settled curve is
// sampled into linear(), with its settle time as the transition duration.
//   node scripts/springs.mjs        prints the two tokens for tokens.css
import { fileURLToPath } from "node:url";

// Position of a unit step response at time t.
export function stepResponse(t, damping, response) {
  const w0 = (2 * Math.PI) / response;
  if (damping >= 1) return 1 - (1 + w0 * t) * Math.exp(-w0 * t);
  const wd = w0 * Math.sqrt(1 - damping ** 2);
  const decay = Math.exp(-damping * w0 * t);
  return 1 - decay * (Math.cos(wd * t) + ((damping * w0) / wd) * Math.sin(wd * t));
}

// The time after which the spring stays within `tolerance` of its target.
export function settleTime(damping, response, tolerance = 0.004) {
  let settled = 0;
  for (let t = 0; t <= 4; t += 0.001) if (Math.abs(1 - stepResponse(t, damping, response)) > tolerance) settled = t;
  return Math.ceil((settled + 0.001) * 1000);
}

export function springEasing({ damping, response, points = 40 }) {
  const duration = settleTime(damping, response);
  const values = Array.from({ length: points + 1 }, (_, i) => (i === points ? 1 : stepResponse((i / points) * (duration / 1000), damping, response)));
  const text = values.map((v, i) => (i === 0 ? "0" : i === points ? "1" : String(Math.round(v * 10000) / 10000))).join(", ");
  return { duration, easing: `linear(${text})` };
}

// Apple's defaults: critically damped for anything the user taps, a little
// bounce only where a flick or a throw carried momentum.
export const SPRINGS = {
  settle: { damping: 1, response: 0.34 },
  flick: { damping: 0.8, response: 0.34 },
};

export function springTokens() {
  return Object.entries(SPRINGS).map(([name, spec]) => ({ name, ...springEasing(spec) }));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  for (const { name, duration, easing } of springTokens()) console.log(`--spring-${name}: ${easing};\n--spring-${name}-time: ${duration}ms;`);
}
