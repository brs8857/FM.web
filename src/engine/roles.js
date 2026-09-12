/* ------------------------------ Roles ------------------------------------
   Each role carries emphasis weights (0-1ish) toward five phase contributions:
   att (attacking threat), def (defensive solidity), build (buildup passing),
   press (pressing/work-rate), create (chance creation). Duties then scale
   att/def further. This is what makes role+duty *mechanically* matter,
   not just flavor text. */
export const ROLES = {
  GK: [
    { key: "GK", label: "Goalkeeper", duties: ["Defend"], desc: "Old-school shot-stopper — commands his six-yard box, deals with crosses, and doesn't complicate his distribution.", att: 0.05, def: 1.00, build: 0.30, press: 0.10, create: 0.05 },
    { key: "SK", label: "Sweeper Keeper", duties: ["Defend", "Support"], desc: "Plays right up to the edge of the box, snuffs out through-balls in behind a high line, and is comfortable enough on the ball to act as an auxiliary passing outlet.", att: 0.10, def: 0.90, build: 0.65, press: 0.30, create: 0.15 },
  ],
  CB: [
    { key: "NCB", label: "No-Nonsense Centre-Back", duties: ["Defend"], desc: "First to every header, first to hoof it clear — zero interest in playing out from the back under pressure.", att: 0.05, def: 1.10, build: 0.20, press: 0.20, create: 0.05 },
    { key: "STP", label: "Stopper", duties: ["Defend"], desc: "Steps out of the line to meet the striker early and win the physical duel before it develops — high risk if he's turned.", att: 0.10, def: 1.05, build: 0.30, press: 0.50, create: 0.10 },
    { key: "CVR", label: "Cover CB", duties: ["Defend"], desc: "The reader of the pairing — sits off, covers the space in behind a more aggressive partner, and mops up through balls.", att: 0.05, def: 1.10, build: 0.40, press: 0.15, create: 0.10 },
    { key: "BPD", label: "Ball-Playing Defender", duties: ["Defend", "Support"], desc: "Comfortable stepping into midfield with the ball at his feet to break the first press line and progress play into the half-spaces.", att: 0.15, def: 0.95, build: 0.90, press: 0.25, create: 0.35 },
  ],
  FB: [
    { key: "FB", label: "Full-Back", duties: ["Defend", "Support"], desc: "Disciplined and positionally sound — holds the width, tracks his winger, and only joins the attack when the coast is clear.", att: 0.30, def: 0.90, build: 0.50, press: 0.35, create: 0.25 },
    { key: "IFB", label: "Inverted Full-Back", duties: ["Defend", "Support"], desc: "Tucks infield into midfield when his side has the ball, forming an auxiliary pivot and protecting against the counter — a Guardiola-era staple.", att: 0.30, def: 0.80, build: 0.85, press: 0.30, create: 0.40 },
    { key: "OFB", label: "Overlapping Full-Back", duties: ["Support", "Attack"], desc: "Bombs down the outside of his winger to provide natural width and get crosses in from the byline.", att: 0.60, def: 0.65, build: 0.55, press: 0.30, create: 0.45 },
    { key: "WB", label: "Wing-Back", duties: ["Support", "Attack"], desc: "Covers the entire flank box-to-box in a back three — the primary source of width in the system.", att: 0.65, def: 0.60, build: 0.55, press: 0.35, create: 0.45 },
    { key: "CWB", label: "Complete Wing-Back", duties: ["Attack"], desc: "A relentless every-blade-of-grass outlet — overlaps, underlaps, delivers crosses, and still recovers to defend his channel.", att: 0.75, def: 0.55, build: 0.60, press: 0.40, create: 0.55 },
  ],
  DM: [
    { key: "ANC", label: "Anchor Man", duties: ["Defend"], desc: "Screens the back line and holds his zone religiously — the pure defensive pivot that lets everyone else take risks in front of him.", att: 0.10, def: 1.05, build: 0.40, press: 0.30, create: 0.10 },
    { key: "DLP", label: "Deep-Lying Playmaker", duties: ["Defend", "Support"], desc: "Drops between the centre-backs to receive the ball under pressure and dictate the tempo of build-up from deep — the Pirlo/Busquets archetype.", att: 0.20, def: 0.75, build: 1.10, press: 0.20, create: 0.60 },
    { key: "BWM", label: "Ball-Winning Midfielder", duties: ["Defend", "Support"], desc: "Hunts the ball aggressively and breaks up the opposition's rhythm before it can develop — the engine room enforcer.", att: 0.25, def: 1.00, build: 0.40, press: 0.90, create: 0.15 },
    { key: "RPM", label: "Roaming Playmaker", duties: ["Support"], desc: "Ignores his zonal discipline to hunt pockets of space wherever the game is being decided, dragging opponents out of position.", att: 0.35, def: 0.70, build: 0.90, press: 0.40, create: 0.65 },
  ],
  CM: [
    { key: "CM", label: "Central Midfielder", duties: ["Defend", "Support", "Attack"], desc: "The honest, balanced pivot — covers ground, recycles possession, contributes at both ends without a defined specialism.", att: 0.40, def: 0.75, build: 0.75, press: 0.40, create: 0.40 },
    { key: "B2B", label: "Box-to-Box", duties: ["Support"], desc: "Covers every blade of grass — tracks back to defend his own box, then arrives late into the opposition's to get on the end of things.", att: 0.55, def: 0.70, build: 0.65, press: 0.55, create: 0.35 },
    { key: "MEZ", label: "Mezzala", duties: ["Support", "Attack"], desc: "Drifts into the half-space between the lines to combine, overload the opposition full-back, and shoot from range.", att: 0.65, def: 0.50, build: 0.70, press: 0.35, create: 0.60 },
    { key: "APM", label: "Advanced Playmaker", duties: ["Support", "Attack"], desc: "The creative fulcrum in central midfield — always available for the ball, always scanning for the incisive line-breaking pass.", att: 0.55, def: 0.40, build: 0.85, press: 0.20, create: 0.85 },
  ],
  AM: [
    { key: "AMD", label: "Attacking Midfielder", duties: ["Support", "Attack"], desc: "Operates in the pocket just off the striker — the connective tissue between midfield and the final third.", att: 0.70, def: 0.35, build: 0.65, press: 0.25, create: 0.70 },
    { key: "APM2", label: "Advanced Playmaker", duties: ["Support"], desc: "Sits centrally in the number 10 space and pulls the strings for the runners around him rather than making the runs himself.", att: 0.55, def: 0.30, build: 0.80, press: 0.20, create: 0.90 },
    { key: "SS", label: "Shadow Striker", duties: ["Attack"], desc: "Times late, disguised runs beyond the front man to arrive in the box just as the ball does — a genuine second scoring threat.", att: 0.85, def: 0.20, build: 0.40, press: 0.20, create: 0.45 },
    { key: "ENG", label: "Enganche", duties: ["Support"], desc: "The classic South American number 10 — sits in the hole, receives on the half-turn, and picks passes nobody else on the pitch sees.", att: 0.50, def: 0.20, build: 0.70, press: 0.10, create: 0.85 },
  ],
  WIDE: [
    { key: "WNG", label: "Winger", duties: ["Support", "Attack"], desc: "Traditional touchline threat — isolates his full-back one-on-one and whips crosses in from the byline.", att: 0.65, def: 0.35, build: 0.45, press: 0.30, create: 0.55 },
    { key: "IW", label: "Inverted Winger", duties: ["Support", "Attack"], desc: "Plays on the 'wrong' side to cut inside onto his stronger foot, threatening the shot or the disguised through-ball.", att: 0.75, def: 0.30, build: 0.50, press: 0.25, create: 0.60 },
    { key: "WP", label: "Wide Playmaker", duties: ["Support"], desc: "Drops off the touchline into deeper pockets to help build play before drifting infield to link the attack.", att: 0.50, def: 0.40, build: 0.70, press: 0.25, create: 0.70 },
    { key: "TW", label: "Touchline Winger", duties: ["Attack"], desc: "Stays glued to the touchline and direct — pure pace in behind and end product delivered from the byline.", att: 0.75, def: 0.25, build: 0.35, press: 0.20, create: 0.45 },
  ],
  ST: [
    { key: "POA", label: "Poacher", duties: ["Attack"], desc: "Lives off the last shoulder in the 18-yard box — minimal involvement in build-up, pure predatory finishing instinct.", att: 0.95, def: 0.10, build: 0.20, press: 0.15, create: 0.15 },
    { key: "TM", label: "Target Man", duties: ["Support", "Attack"], desc: "Wins the aerial duel, holds the ball up with his back to goal, and lays it off to bring runners into the game.", att: 0.75, def: 0.20, build: 0.50, press: 0.25, create: 0.35 },
    { key: "F9", label: "False 9", duties: ["Support"], desc: "Drops off the front line into midfield to drag his marker out of position, opening the channel for others to exploit.", att: 0.55, def: 0.25, build: 0.70, press: 0.30, create: 0.75 },
    { key: "PF", label: "Pressing Forward", duties: ["Attack", "Defend"], desc: "The first line of the press — hounds centre-backs into rushed clearances and forces mistakes high up the pitch.", att: 0.70, def: 0.40, build: 0.35, press: 0.85, create: 0.20 },
    { key: "DLF", label: "Deep-Lying Forward", duties: ["Support"], desc: "Drops short to link play between the lines before turning provider for the runners beyond him.", att: 0.65, def: 0.25, build: 0.65, press: 0.25, create: 0.60 },
    { key: "CF", label: "Complete Forward", duties: ["Support", "Attack"], desc: "The total centre-forward — finishes, creates, holds the ball up, and presses from the front. No weaknesses in his game.", att: 0.85, def: 0.25, build: 0.55, press: 0.35, create: 0.55 },
  ],
};

export const DUTY_INFO = {
  Defend: { label: "Defend", desc: "Conservative brief — holds his position, prioritises shape and rest defence over joining the attack.", attMul: 0.72, defMul: 1.28 },
  Support: { label: "Support", desc: "The balanced middle ground — splits his attention between both boxes rather than committing fully either way.", attMul: 1.00, defMul: 1.00 },
  Attack: { label: "Attack", desc: "Licence to commit — gets forward in numbers and takes on risk in transition, at the expense of defensive solidity.", attMul: 1.32, defMul: 0.70 },
};

export function defaultRoleFor(slotType) { return ROLES[slotType][0]; }
export function defaultDutyFor(role) { return role.duties.includes("Support") ? "Support" : role.duties[0]; }
