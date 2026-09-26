import { clamp } from "./util.js";
import { DUTY_INFO } from "./roles.js";

// Diminishing returns at the very top. On these raw scales an ordinary
// drafted XI sits around 90 and a side of peak legends from every era clears
// 97; above 94 each point is worth half, so the legends are favourites but
// not certainties. Set lower, it also flattened the gap between an ordinary
// XI and a good one until the draft barely mattered (plan C5).
export function compress(v, threshold = 94, factor = 0.5) {
  return v > threshold ? threshold + (v - threshold) * factor : v;
}

// Cohesion scales every phase rating, from 0.616 at 15 or below to 0.976 at 92.
export function executionMultiplier(familiarity) {
  const t = clamp((familiarity - 15) / (92 - 15), 0, 1);
  return 0.616 + t * (0.976 - 0.616);
}

// On the 0-100 board y=8 is the opponent's goal line and y=92 your own, so a
// marker dragged forward attacks more and defends less.
export function positionFactors(pos) {
  const adv = clamp((92 - pos.y) / 84, 0, 1);
  const wide = clamp(Math.abs(pos.x - 50) / 46, 0, 1);
  return { adv, wide };
}

export function playerContribution(assignment) {
  const { player, role, duty, sliderAtt, sliderDef, pos } = assignment;
  const s = player.stats;
  const dm = DUTY_INFO[duty];
  const freedomAtt = 1 + (sliderAtt - 50) / 140;
  const disciplineDef = 1 + (sliderDef - 50) / 140;
  const { adv, wide } = pos ? positionFactors(pos) : { adv: 0.5, wide: 0.5 };
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

  // Compressed once, before the dials: compressing again afterwards would
  // shrink whatever a dial raises but not what it lowers, so every committed
  // tactic would lose to sitting in the middle.
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

  // Mentality moves points between attack and defence rather than adding to
  // either, so the middle is neutral rather than safe.
  const mentalityShift = (men - 50) / 50 * 12;
  attack += mentalityShift;
  defense -= mentalityShift;
  creativity += mentalityShift * 0.45 + (dir < 50 ? (50 - dir) * 0.10 : 0);

  attack += (tem - 50) * 0.05 + (wid - 50) * 0.06;
  defense -= (tem - 50) * 0.04 + (wid - 50) * 0.05;
  defense += (tk - 50) * 0.05;
  attack -= (tk - 50) * 0.03;

  buildup = buildup * (1 - Math.abs(dir - 50) / 95) * (1 + (tem - 50) / 150) + (foc < 50 ? (50 - foc) * 0.11 : 0);
  creativity += (foc < 50 ? (50 - foc) * 0.13 : -(foc - 50) * 0.05);
  attack += (foc - 50) * 0.04;

  const crossPayoff = crossing * (crs / 100) * (0.5 + avgWide * 0.9) * (0.6 + wid / 160);
  creativity += crossPayoff * 0.22;
  attack += crossPayoff * 0.07;
  defense -= crossPayoff * 0.15;

  attack += (ctr - 50) * 0.08 + (ctr > 60 && press >= 55 ? (ctr - 50) * 0.03 : 0);
  defense -= Math.max(0, ctr - 50) * 0.04;
  buildup -= Math.max(0, ctr - 50) * 0.06;

  buildup += (50 - gkd) * 0.11;
  creativity += (50 - gkd) * 0.04;
  attack += Math.max(0, gkd - 50) * 0.06 * (ctr / 100 + 0.3);
  press += Math.max(0, gkd - 50) * 0.03;

  press += (pr - 50) * 0.35;
  physical += (tk - 50) * 0.12;
  // A high press wins the ball high: a little attack for the defensive risk below.
  attack += Math.max(0, pr - 50) * 0.06;

  const lineRisk = Math.max(0, ln - 55) / 55;
  const pressRisk = Math.max(0, pr - 65) / 70;
  let defSolidity = defense * (1 - lineRisk * 0.22 - pressRisk * 0.15) + (buildup > 65 ? 2 : 0);
  // A deep line packs the box: harder to play through, nothing on the break.
  defSolidity += Math.max(0, 45 - ln) * 0.10;
  attack -= Math.max(0, 45 - ln) * 0.08;
  if (instructions.offsideTrap) {
    const paceProxy = clamp((physical - 50) / 50, -1, 1);
    defSolidity += ln >= 55 ? (5 + paceProxy * 4) : -6;
  }
  defSolidity += instructions.marking === "man" ? 2 : -1;
  attack += instructions.marking === "man" ? -1 : 0.5;
  if (instructions.shape === "fluid") { attack += 3; defSolidity -= 3; creativity += 2; }
  else { attack -= 2; defSolidity += 2; creativity -= 1; }

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

// A named identity earns a bonus on top of what its dials already give, gated
// by cohesion: nothing below 35, the full bonus from 80.
export function identitySynergy(instructions, familiarity, physical) {
  const { mentality: men, press: pr, line: ln, tempo: tem, directness: dir, width: wid, counter: ctr, crossing: crs, shape } = instructions;
  const gate = clamp((familiarity - 35) / 45, 0, 1);
  let attack = 0, defense = 0, press_ = 0, creativity = 0, label = null;

  // Each bonus is sized to what the identity's dials already pay for: a
  // counter's breaks and a wing side's crosses earn their keep above, so
  // their bonus is small; possession and the bus give more away there and
  // get more back here. `npm run sim -- --assert` holds every one of them to
  // the same title and relegation odds.
  if (pr >= 66 && ln >= 60 && tem >= 60) {
    const strength = gate * (0.7 + clamp((physical - 55) / 45, 0, 0.3));
    attack += 4.5 * strength; press_ += 8 * strength; defense += 3 * strength;
    label = "Gegenpress";
  }
  else if (ln <= 38 && pr <= 40 && ctr >= 60) {
    defense += 0.5 * gate;
    label = "Low Block Counter";
  }
  else if (dir <= 38 && tem <= 60 && men >= 45 && men <= 78 && shape === "structured") {
    creativity += 8 * gate; defense += 7 * gate; attack += 5.5 * gate;
    label = "Possession Control";
  }
  else if (wid >= 72 && crs >= 62) {
    creativity += 3 * gate; attack += 1 * gate;
    label = "Wing Play";
  }
  else if (dir >= 68 && tem >= 62 && men >= 60) {
    attack += 2.5 * gate; creativity -= 2 * gate;
    label = "Direct & Vertical";
  }
  else if (men <= 25 && ln <= 32 && pr <= 35) {
    defense += 8 * gate; attack += 4.5 * gate;
    label = "Park The Bus";
  }

  if (familiarity >= 80) { attack += 2; defense += 2; creativity += 1; }
  else if (familiarity < 38) { attack -= 2; defense -= 2; }

  // Unnamed: every dial near neutral is punished; a committed set-up that
  // matches no template earns a smaller bonus.
  if (!label) {
    const extremity = dialExtremity(instructions);
    if (extremity < NEUTRAL_EXTREMITY) {
      attack -= 0.5; defense -= 0.5; creativity -= 1;
    } else {
      const bespoke = clamp((extremity - NEUTRAL_EXTREMITY) / 0.5, 0, 1) * gate;
      attack += 2 * bespoke; defense += 2 * bespoke; creativity += 1.5 * bespoke;
    }
  }

  return { attack, defense, press: press_, creativity, label };
}

export const NEUTRAL_EXTREMITY = 0.16;

// 0 with every identity dial at 50, 1 with every one at an end.
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
