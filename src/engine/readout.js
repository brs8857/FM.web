import { dialExtremity, NEUTRAL_EXTREMITY } from "./tactics.js";

export function tacticalReadout(profile, instructions, familiarity) {
  const notes = [];
  const { mentality: men, press: pr, line: ln, tempo: tem, directness: dir, width: wid, counter: ctr, crossing: crs, offsideTrap: trap } = instructions;

  if (profile.synergyLabel) {
    const strength = familiarity >= 70 ? "drilled" : familiarity >= 45 ? "taking shape" : "not drilled in yet";
    notes.push(`${profile.synergyLabel}, ${strength}. Drilled well, it's worth extra on match day.`);
  } else {
    if (dialExtremity(instructions) < NEUTRAL_EXTREMITY) notes.push("No plan: every dial is close to neutral, and a side with no plan gets picked apart. Commit to something, even something odd.");
  }

  if (pr >= 68 && ln >= 65) notes.push("A high press with a high line. It wins the ball up the pitch, and leaves space in behind when it doesn't.");
  else if (pr <= 32 && ln <= 35) notes.push("A mid-to-low block that gives up ground on purpose: hard to play through, but you'll be without the ball for long spells.");

  if (trap && ln >= 55) notes.push("The offside trap with a high line behind it. It catches forwards until one step is mistimed.");
  else if (trap && ln < 55) notes.push("The offside trap is on, but the line is too deep to catch anyone.");

  if (men >= 75 && profile.defSolidity < 55) notes.push("All-out, with little left at the back: expect end-to-end games, not clean sheets.");
  else if (men <= 25 && profile.attack < 55) notes.push("Set up to contain. You'll grind out results, and struggle against a side that sits in.");

  if (ctr >= 70) notes.push("Built to counter: let them have it, then break quickly. You won't control many games.");
  if (crs >= 70 && wid >= 55) notes.push("Early crosses from wide and deep. Worth it with a big man and runners arriving late.");
  else if (crs >= 70 && wid < 40) notes.push("Told to cross, but set up narrow: nobody is out wide to cross from.");

  if (tem >= 70 && dir <= 35) notes.push("Quick, short passing. Hard work, and too quick for a settled defence when it comes off.");
  if (dir >= 70) notes.push("Direct passing skips the midfield and gains ground fast, at the cost of the ball.");
  if (wid >= 75) notes.push("Real width stretches their back four and can leave gaps in your own middle.");
  if (wid <= 25) notes.push("Narrow and compact: good for combinations inside, but the channels go unused.");

  if (familiarity < 40) notes.push("The players don't know this system yet. Expect patchy results until it beds in.");
  else if (familiarity >= 82) notes.push("The players know this system inside out, and it shows every week.");

  if (notes.length === 0) notes.push("Nothing extreme: a sensible set-up with no obvious weakness, and no obvious edge.");
  return notes.slice(0, 5);
}

export function mentalityLabel(v) {
  if (v <= 20) return "Contain";
  if (v <= 42) return "Careful";
  if (v <= 58) return "Even";
  if (v <= 80) return "Front-foot";
  return "All-out";
}
