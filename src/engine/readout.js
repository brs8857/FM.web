/* ------------------------------ Plain-English readout ---------------------- */
export function tacticalReadout(profile, instructions, familiarity) {
  const notes = [];
  const { mentality: men, press: pr, line: ln, tempo: tem, directness: dir, width: wid, counter: ctr, crossing: crs, offsideTrap: trap } = instructions;

  if (profile.synergyLabel) {
    const strength = familiarity >= 70 ? "firing on all cylinders" : familiarity >= 45 ? "starting to take shape" : "recognisable but not yet drilled in";
    notes.push(`Identity detected: ${profile.synergyLabel} — ${strength}. This specific combination carries a genuine bonus in the simulation when it's well-drilled.`);
  } else {
    const dials = [men, tem, dir, wid, pr, ln, instructions.tackling];
    const extremity = dials.reduce((sum, v) => sum + Math.abs(v - 50), 0) / dials.length / 50;
    if (extremity < 0.16) notes.push("No real identity here — every dial is sat close to neutral. A side with no discernible game plan is there to be picked apart; commit to a clearer approach, even an unconventional one.");
  }

  if (pr >= 68 && ln >= 65) notes.push("An aggressive front-foot press with a high defensive line — devastating when the trigger is right, but there's real space in behind if the front line doesn't win the ball back quickly.");
  else if (pr <= 32 && ln <= 35) notes.push("A settled mid-to-low block that cedes territory by design — hard to break down through the middle, but you'll surrender the ball for long spells and lean on transitions.");

  if (trap && ln >= 55) notes.push("The offside trap is live with a high line to support it — a genuine edge if your back line's coordination holds up, but one mistimed step in behind and it's a straight run at goal.");
  else if (trap && ln < 55) notes.push("The offside trap is switched on without a high enough line behind it — there isn't the space being played into to actually catch anyone offside.");

  if (men >= 75 && profile.defSolidity < 55) notes.push("A properly gung-ho mentality with an exposed rest defence — expect box-to-box, end-to-end scorelines rather than clean sheets.");
  else if (men <= 25 && profile.attack < 55) notes.push("A risk-averse, containment-first mentality — you'll grind results out but may lack the guile to break down a side that sits in.");

  if (ctr >= 70) notes.push("Built explicitly to counter — soak up territory, then break vertically in transition, at the cost of sustained control of matches.");
  if (crs >= 70 && wid >= 55) notes.push("Crosses are coming in early and often from deep, wide areas — a genuine weapon if there's a physical presence and late runners to attack the ball.");
  else if (crs >= 70 && wid < 40) notes.push("The instruction is to cross often, but the shape is narrow — there isn't the width to actually deliver good service from.");

  if (tem >= 70 && dir <= 35) notes.push("High tempo combined with short passing is demanding on work-rate and technique, but can genuinely overwhelm a settled, organised defence.");
  if (dir >= 70) notes.push("Direct, vertical passing bypasses the midfield battle and wins territory fast, at the expense of sustained possession share.");
  if (wid >= 75) notes.push("Playing with real width stretches the opposition's back line horizontally, but can open gaps between your own units centrally.");
  if (wid <= 25) notes.push("A narrow, compact shape packs the half-spaces for combination play, but the space in the channels behind the full-backs goes largely unused.");

  if (familiarity < 40) notes.push("The group hasn't bought into this system yet — expect streaky, inconsistent performances while the principles bed in on the training ground.");
  else if (familiarity >= 82) notes.push("This is a drilled, second-nature system — the group executes the game plan with real consistency, week in, week out.");

  if (notes.length === 0) notes.push("A balanced, coherent set-up without any glaring extremes — unspectacular, but a solid platform to build from.");
  return notes.slice(0, 5);
}

export function mentalityLabel(v) {
  if (v <= 20) return "Contain";
  if (v <= 42) return "Careful";
  if (v <= 58) return "Even";
  if (v <= 80) return "Front-foot";
  return "All-out";
}
