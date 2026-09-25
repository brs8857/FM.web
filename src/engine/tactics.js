import { clamp } from "./util.js";
import { DUTY_INFO } from "./roles.js";

// Diminishing returns above a threshold. A real top-flight squad rarely
// sits much above the high-70s/low-80s on these scales; a team stacked with
// peak legends drafted across every era of the league can clear 90+ on raw
// numbers, which is exactly the "too easy" problem. This doesn't cap what
// you can draft, but it does mean an all-time-great XI's edge over a proper
// current side is meaningfully smaller than the raw stat gap suggests —
// class and cohesion still matter more than a spreadsheet of peak ratings.
export function compress(v, threshold = 79, factor = 0.53) {
  return v > threshold ? threshold + (v - threshold) * factor : v;
}

// The single biggest lever for "tactics matter more than talent": the same
// raw player quality plays out completely differently depending on how
// coherent and well-drilled the tactical setup is. A poorly-drilled system
// (clashing roles, incoherent instructions, a squad thrown together across
// eras) genuinely squanders a great squad's quality; a masterfully drilled
// one gets meaningfully more out of the same players than their raw numbers
// alone would suggest.
export function executionMultiplier(familiarity) {
  const t = clamp((familiarity - 15) / (92 - 15), 0, 1);
  return 0.70 + t * (1.08 - 0.70);
}

/* ============================ Team Tactics Engine =========================
   Combines each starter's stats + role emphasis + duty + personal sliders +
   their exact freeform pitch position with team-wide instructions into the
   six 0-100 "phase" ratings used for both the radar chart and the season
   simulation. Every number here is derived transparently from inputs — this
   deliberately swings hard: tactics are meant to be the main lever, not a
   cosmetic layer on top of raw player quality. */

// Given a player's exact pitch position (0-100, y=8 is the opponent's goal,
// y=92 is your own goal), derive how advanced/wide they're actually standing.
// This is what makes free positioning a real tactical lever and not just
// decoration: drag a holding midfielder up into the box and he genuinely
// contributes more going forward (at a defensive and familiarity cost).
export function positionFactors(pos) {
  const adv = clamp((92 - pos.y) / 84, 0, 1);       // 0 deepest .. 1 most advanced
  const wide = clamp(Math.abs(pos.x - 50) / 46, 0, 1); // 0 central .. 1 touchline
  return { adv, wide };
}

export function playerContribution(assignment) {
  // assignment: { player, role, duty, sliderAtt, sliderDef, pos }
  const { player, role, duty, sliderAtt, sliderDef, pos } = assignment;
  const s = player.stats;
  const dm = DUTY_INFO[duty];
  const freedomAtt = 1 + (sliderAtt - 50) / 140;
  const disciplineDef = 1 + (sliderDef - 50) / 140;
  const { adv, wide } = pos ? positionFactors(pos) : { adv: 0.5, wide: 0.5 };
  // Standing higher up the pitch meaningfully shifts a player toward attack
  // and away from defense, and vice versa — a big, visible lever.
  const advAtt = 0.55 + adv * 0.9;
  const advDef = 0.55 + (1 - adv) * 0.9;

  const attScore = (s.shooting * 0.32 + s.dribbling * 0.28 + s.pace * 0.24 + s.passing * 0.16);
  const defScore = (s.defending * 0.50 + s.physical * 0.30 + s.pace * 0.20);
  const buildScore = (s.passing * 0.65 + s.dribbling * 0.20 + s.pace * 0.15);
  const pressScore = (s.physical * 0.45 + s.pace * 0.40 + s.defending * 0.15);
  const createScore = (s.passing * 0.5 + s.dribbling * 0.5);
  const crossScore = (s.pace * 0.35 + s.dribbling * 0.30 + s.passing * 0.35) * (0.6 + wide * 0.8);

  return {
    att: attScore * role.att * dm.attMul * freedomAtt * advAtt,
    def: defScore * role.def * dm.defMul * disciplineDef * advDef,
    build: buildScore * role.build,
    press: pressScore * role.press,
    create: createScore * role.create,
    cross: crossScore * (role.att + role.create) / 2,
    wAtt: role.att * dm.attMul,
    wDef: role.def * dm.defMul,
    wBuild: role.build,
    wPress: role.press,
    wCreate: role.create,
    wCross: (role.att + role.create) / 2,
    physical: s.physical,
    wide,
  };
}

export function computeTeamProfile(assignments, instructions, familiarity = 60) {
  const list = assignments.filter((a) => a && a.player);
  if (list.length === 0) {
    return { attack: 40, defense: 40, buildup: 40, press: 40, creativity: 40, physical: 40, defSolidity: 40, avgOv: 40 };
  }
  let acc = { att: 0, def: 0, build: 0, press: 0, create: 0, phys: 0, cross: 0, wide: 0 };
  let w = { att: 0, def: 0, build: 0, press: 0, create: 0, cross: 0 };
  let ovSum = 0;
  list.forEach((a) => {
    const c = playerContribution(a);
    acc.att += c.att; acc.def += c.def; acc.build += c.build; acc.press += c.press; acc.create += c.create;
    acc.phys += c.physical; acc.cross += c.cross; acc.wide += c.wide;
    w.att += c.wAtt; w.def += c.wDef; w.build += c.wBuild; w.press += c.wPress; w.create += c.wCreate; w.cross += c.wCross;
    ovSum += a.player.ov;
  });
  const avg = (sum, wsum) => (wsum > 0 ? sum / wsum : sum / list.length);

  // Diminishing returns for stacked squad quality are applied ONCE here, to
  // the raw player-derived numbers only — not again after tactical trade-offs
  // are folded in. That matters: if compression were reapplied at the end,
  // any stat you push up would get diminished while its paired stat going
  // down would take the full uncompressed hit, structurally punishing every
  // committed, specialised tactic in favour of just sitting in the middle.
  // Compressing the baseline once keeps every trade-off below genuinely fair
  // and symmetric — a real strategic choice, not a mathematically inferior one.
  let attack = compress(avg(acc.att, w.att));
  let defense = compress(avg(acc.def, w.def));
  let buildup = compress(avg(acc.build, w.build));
  let press = compress(avg(acc.press, w.press));
  let creativity = compress(avg(acc.create, w.create));
  let physical = compress(acc.phys / list.length, 81, 0.63);
  const crossing = avg(acc.cross, w.cross);
  const avgWide = acc.wide / list.length;

  const men = instructions.mentality, tem = instructions.tempo, dir = instructions.directness;
  const wid = instructions.width, pr = instructions.press, ln = instructions.line, tk = instructions.tackling;
  const foc = instructions.focus, ctr = instructions.counter, crs = instructions.crossing, gkd = instructions.gkDistribution;

  // --- Mentality: the master dial, now a genuine transfer rather than an
  // independent multiplier on each side. Going all-in on attack costs
  // defense the same amount it buys in attack, and vice versa — sitting in
  // the middle is neutral, not automatically optimal. Which way to lean is a
  // real strategic call, shaped by matchup and the identity bonuses below. ---
  const mentalityShift = (men - 50) / 50 * 15;
  attack += mentalityShift + (wid - 50) * 0.06 + (tem - 50) * 0.05;
  defense -= mentalityShift;
  defense += (tk - 50) * 0.05;
  creativity += mentalityShift * 0.45 + (dir < 50 ? (50 - dir) * 0.10 : 0);

  // --- In possession shape ---
  buildup = buildup * (1 - Math.abs(dir - 50) / 95) * (1 + (tem - 50) / 150) + (foc < 50 ? (50 - foc) * 0.11 : 0);
  // Passing focus: through-the-middle rewards central creativity but is more
  // congested to break down; down-the-flanks trades some central craft for a
  // cleaner, more direct route past a packed defense.
  creativity += (foc < 50 ? (50 - foc) * 0.13 : -(foc - 50) * 0.05);
  attack += (foc - 50) * 0.05 + (wid - 50) * 0.04;

  // --- Crossing instruction: rewards width + wide-role players, wasted if narrow ---
  const crossPayoff = crossing * (crs / 100) * (0.5 + avgWide * 0.9) * (0.6 + wid / 160);
  creativity += crossPayoff * 0.22;
  attack += crossPayoff * 0.16;

  // --- Counter-attacking: big transitional swing, trades away control ---
  attack += (ctr - 50) * 0.11 + (ctr > 60 && press >= 55 ? (ctr - 50) * 0.05 : 0);
  buildup -= Math.max(0, ctr - 50) * 0.06;

  // --- GK distribution: long favors quick transitions and physical duels,
  // short favors control and press resistance — a real trade-off either way. ---
  buildup += (50 - gkd) * 0.11;
  creativity += (50 - gkd) * 0.04;
  attack += Math.max(0, gkd - 50) * 0.09 * (ctr / 100 + 0.3);
  press += Math.max(0, gkd - 50) * 0.03;

  // --- Out of possession ---
  press += (pr - 50) * 0.35;
  physical += (tk - 50) * 0.12;

  // --- Defensive solidity: shaped hard by line/press risk and the offside trap gamble ---
  const lineRisk = Math.max(0, ln - 55) / 55;       // high line = far more space in behind
  const pressRisk = Math.max(0, pr - 65) / 70;      // very high press = bypassed if press resistance is low
  let defSolidity = defense * (1 - lineRisk * 0.30 - pressRisk * 0.20) + (buildup > 65 ? 2 : 0);
  if (instructions.offsideTrap) {
    // rewards a fast, disciplined line hugely if it holds; a big swing either way
    const paceProxy = clamp((physical - 50) / 50, -1, 1);
    defSolidity += ln >= 55 ? (8 + paceProxy * 6) : -6;
  }
  const markingBonus = instructions.marking === "man" ? 4 : -2.5;
  defSolidity += markingBonus;
  const shapeAttackBonus = instructions.shape === "fluid" ? 3.5 : 0;
  const shapeDefBonus = instructions.shape === "structured" ? 4 : -2.5;
  attack += shapeAttackBonus;
  defSolidity += shapeDefBonus;
  creativity += instructions.shape === "fluid" ? 2 : -1;

  // --- Tactical identity synergy: specific, coherent real-world combinations
  // get a deliberate extra reward on top of their individual components. This
  // is the main lever for "good tactics beat good players" — a sharp, well
  // -drilled identity should meaningfully outperform a stat-matched but
  // incoherent setup. See identitySynergy() below for the combinations. ---
  const synergy = identitySynergy(instructions, familiarity, physical);
  attack += synergy.attack;
  defSolidity += synergy.defense;
  press += synergy.press;
  creativity += synergy.creativity;

  const mult = executionMultiplier(familiarity);

  return {
    attack: clamp(attack * mult, 15, 99),
    defense: clamp(defense * mult, 15, 99),
    defSolidity: clamp(defSolidity * mult, 10, 99),
    buildup: clamp(buildup * mult, 15, 99),
    press: clamp(press * mult, 15, 99),
    creativity: clamp(creativity * mult, 15, 99),
    physical: clamp(physical, 15, 99),
    avgOv: ovSum / list.length,
    synergyLabel: synergy.label,
    executionMult: mult,
  };
}

// Deliberate bonuses for specific, coherent tactical identities — this is
// what gives certain well-known combinations of instructions a genuinely
// better chance of winning the league, on top of what their individual
// component numbers already produce. Familiarity gates most of these: you
// need the system reasonably well-drilled for the identity to actually pay
// off, mirroring how a real "philosophy" only clicks once a squad knows it.
export function identitySynergy(instructions, familiarity, physical) {
  const { mentality: men, press: pr, line: ln, tempo: tem, directness: dir, width: wid, counter: ctr, crossing: crs, shape } = instructions;
  const gate = clamp((familiarity - 35) / 45, 0, 1); // 0 below ~35 familiarity, 1 by ~80
  let attack = 0, defense = 0, press_ = 0, creativity = 0, label = null;

  // Gegenpress: high press + high line + high tempo + fit squad
  if (pr >= 66 && ln >= 60 && tem >= 60) {
    const strength = gate * (0.6 + clamp((physical - 55) / 45, 0, 0.4));
    attack += 9 * strength; press_ += 10 * strength; defense += 3 * strength;
    label = "Gegenpress";
  }
  // Low block / counter: deep line, low press, hit on the break
  else if (ln <= 38 && pr <= 40 && ctr >= 60) {
    defense += 10 * gate; attack += 5 * gate;
    label = "Low Block Counter";
  }
  // Possession control: patient, short, structured, balanced-to-positive mentality
  else if (dir <= 38 && tem <= 60 && men >= 45 && men <= 78 && shape === "structured") {
    creativity += 8 * gate; defense += 4 * gate; attack += 3 * gate;
    label = "Possession Control";
  }
  // Wing play: maximum width + heavy crossing, wherever the focus dial sits
  else if (wid >= 72 && crs >= 62) {
    creativity += 7 * gate; attack += 6 * gate;
    label = "Wing Play";
  }
  // Direct/route-one: very direct, high tempo, aggressive mentality
  else if (dir >= 68 && tem >= 62 && men >= 60) {
    attack += 7 * gate; creativity -= 2 * gate;
    label = "Direct & Vertical";
  }
  // Park the bus: very defensive mentality, deep line, low press — pure containment
  else if (men <= 25 && ln <= 32 && pr <= 35) {
    defense += 11 * gate; attack -= 3 * gate;
    label = "Park The Bus";
  }

  // A well-drilled system, whatever it is, is simply more dangerous — and an
  // unfamiliar one leaks a little everywhere. This applies on top of any
  // named identity above.
  if (familiarity >= 80) { attack += 3; defense += 3; creativity += 2; }
  else if (familiarity < 38) { attack -= 3; defense -= 3; }

  // Nothing named matched — this is either a genuine "no clear game plan"
  // setup (every dial sat near neutral) or a bespoke, decisive identity that
  // just doesn't happen to match one of the six named templates above. Real
  // teams without a discernible identity get picked apart by sides who know
  // exactly what they're doing; a side that's clearly committed to *something*
  // — even an unconventional something — earns a smaller version of the same
  // reward the named identities get. Sitting on the fence is the one thing
  // that's actively punished.
  if (!label) {
    const extremity = dialExtremity(instructions);
    if (extremity < NEUTRAL_EXTREMITY) {
      // no plan at all — genuinely there for the opposition to read and exploit
      attack -= 5; defense -= 5; creativity -= 3;
    } else {
      // a real, decisive setup that just isn't one of the six named templates —
      // rewarded, scaled by how committed it actually is and how well-drilled
      const bespoke = clamp((extremity - NEUTRAL_EXTREMITY) / 0.5, 0, 1) * gate;
      attack += 4 * bespoke; defense += 4 * bespoke; creativity += 2 * bespoke;
    }
  }

  return { attack, defense, press: press_, creativity, label };
}

export const NEUTRAL_EXTREMITY = 0.16;

// 0 (every dial dead neutral) .. 1 (every dial maxed out).
export function dialExtremity(instructions) {
  const dials = ["mentality", "tempo", "directness", "width", "press", "line", "tackling"].map((k) => instructions[k]);
  return dials.reduce((sum, v) => sum + Math.abs(v - 50), 0) / dials.length / 50;
}

// What a set of instructions is, for the record and for cohesion memory: a
// named identity, a bespoke one, or no plan at all.
export function identityKey(instructions) {
  const { label } = identitySynergy(instructions, 100, 70);
  if (label) return label;
  return dialExtremity(instructions) < NEUTRAL_EXTREMITY ? "none" : "bespoke";
}
