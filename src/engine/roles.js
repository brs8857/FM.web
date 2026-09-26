// Each job weights a player's attack, defence, build-up, pressing and
// creativity; the brief then scales attack and defence again.
export const ROLES = {
  GK: [
    { key: "GK", label: "Line keeper", duties: ["Defend"], desc: "Stays on his line, stops shots and claims crosses, and keeps his distribution simple.", att: 0.05, def: 1.00, build: 0.30, press: 0.10, create: 0.05 },
    { key: "SK", label: "Sweeper keeper", duties: ["Defend", "Support"], desc: "Stands high to sweep up balls played in behind a high line, and is happy with the ball at his feet.", att: 0.10, def: 0.90, build: 0.65, press: 0.30, create: 0.15 },
  ],
  CB: [
    { key: "NCB", label: "Blocker", duties: ["Defend"], desc: "Heads it, blocks it, clears it. No interest in playing out from the back.", att: 0.05, def: 1.10, build: 0.20, press: 0.20, create: 0.05 },
    { key: "STP", label: "Stopper", duties: ["Defend"], desc: "Steps out to meet the striker early and win the duel before it starts. Exposed if he's turned.", att: 0.10, def: 1.05, build: 0.30, press: 0.50, create: 0.10 },
    { key: "CVR", label: "Cover", duties: ["Defend"], desc: "Sits off and covers behind a more aggressive partner, mopping up the balls over the top.", att: 0.05, def: 1.10, build: 0.40, press: 0.15, create: 0.10 },
    { key: "BPD", label: "Passing centre-back", duties: ["Defend", "Support"], desc: "Carries the ball into midfield and passes through the first line of the press.", att: 0.15, def: 0.95, build: 0.90, press: 0.25, create: 0.35 },
  ],
  FB: [
    { key: "FB", label: "Full-back", duties: ["Defend", "Support"], desc: "Holds the width, tracks his winger and only goes forward when it's safe.", att: 0.30, def: 0.90, build: 0.50, press: 0.35, create: 0.25 },
    { key: "IFB", label: "Inverted full-back", duties: ["Defend", "Support"], desc: "Steps into midfield when his side has the ball: an extra passer in the middle and cover against the counter.", att: 0.30, def: 0.80, build: 0.85, press: 0.30, create: 0.40 },
    { key: "OFB", label: "Overlapping full-back", duties: ["Support", "Attack"], desc: "Runs outside his winger to give the side width and cross from the byline.", att: 0.60, def: 0.65, build: 0.55, press: 0.30, create: 0.45 },
    { key: "WB", label: "Wing-back", duties: ["Support", "Attack"], desc: "Covers the whole flank in a back three. The side's width comes from him.", att: 0.65, def: 0.60, build: 0.55, press: 0.35, create: 0.45 },
    { key: "CWB", label: "All-action wing-back", duties: ["Attack"], desc: "Up and down the flank all afternoon: overlaps, crosses, and still gets back to defend.", att: 0.75, def: 0.55, build: 0.60, press: 0.40, create: 0.55 },
  ],
  DM: [
    { key: "ANC", label: "Holding midfielder", duties: ["Defend"], desc: "Sits in front of the back four and stays there, so everyone else can take risks.", att: 0.10, def: 1.05, build: 0.40, press: 0.30, create: 0.10 },
    { key: "DLP", label: "Deep playmaker", duties: ["Defend", "Support"], desc: "Drops in beside the centre-backs to take the ball under pressure and sets the tempo from deep.", att: 0.20, def: 0.75, build: 1.10, press: 0.20, create: 0.60 },
    { key: "BWM", label: "Ball-winner", duties: ["Defend", "Support"], desc: "Hunts the ball and breaks up play before the other side can get going.", att: 0.25, def: 1.00, build: 0.40, press: 0.90, create: 0.15 },
    { key: "RPM", label: "Roamer", duties: ["Support"], desc: "Leaves his zone to find space wherever the game is, and drags markers with him.", att: 0.35, def: 0.70, build: 0.90, press: 0.40, create: 0.65 },
  ],
  CM: [
    { key: "CM", label: "Central midfielder", duties: ["Defend", "Support", "Attack"], desc: "A bit of everything: covers ground, keeps the ball moving and helps at both ends.", att: 0.40, def: 0.75, build: 0.75, press: 0.40, create: 0.40 },
    { key: "B2B", label: "Box-to-box", duties: ["Support"], desc: "Tracks back into his own box, then turns up late in theirs.", att: 0.55, def: 0.70, build: 0.65, press: 0.55, create: 0.35 },
    { key: "MEZ", label: "Mezzala", duties: ["Support", "Attack"], desc: "Drifts between the lines off-centre to combine, overload the full-back and shoot from distance.", att: 0.65, def: 0.50, build: 0.70, press: 0.35, create: 0.60 },
    { key: "APM", label: "Creator", duties: ["Support", "Attack"], desc: "Always wants the ball in central midfield, always looking for the pass that splits the lines.", att: 0.55, def: 0.40, build: 0.85, press: 0.20, create: 0.85 },
  ],
  AM: [
    { key: "AMD", label: "Attacking midfielder", duties: ["Support", "Attack"], desc: "Plays in the pocket behind the striker and links the midfield to the front line.", att: 0.70, def: 0.35, build: 0.65, press: 0.25, create: 0.70 },
    { key: "APM2", label: "Number 10", duties: ["Support"], desc: "Stays central in the number 10 space and sets up the runners around him rather than running himself.", att: 0.55, def: 0.30, build: 0.80, press: 0.20, create: 0.90 },
    { key: "SS", label: "Second striker", duties: ["Attack"], desc: "Makes late runs beyond the centre-forward to arrive in the box as the ball does.", att: 0.85, def: 0.20, build: 0.40, press: 0.20, create: 0.45 },
    { key: "ENG", label: "Enganche", duties: ["Support"], desc: "Stays in the hole, takes the ball on the half-turn and plays the passes nobody else sees.", att: 0.50, def: 0.20, build: 0.70, press: 0.10, create: 0.85 },
  ],
  WIDE: [
    { key: "WNG", label: "Winger", duties: ["Support", "Attack"], desc: "Stays wide, takes his full-back on and crosses from the byline.", att: 0.65, def: 0.35, build: 0.45, press: 0.30, create: 0.55 },
    { key: "IW", label: "Inverted winger", duties: ["Support", "Attack"], desc: "Plays on the flank opposite his stronger foot and cuts inside to shoot or slip a pass through.", att: 0.75, def: 0.30, build: 0.50, press: 0.25, create: 0.60 },
    { key: "WP", label: "Wide creator", duties: ["Support"], desc: "Comes in off the touchline to help build play, then drifts inside to link the attack.", att: 0.50, def: 0.40, build: 0.70, press: 0.25, create: 0.70 },
    { key: "TW", label: "Out-and-out winger", duties: ["Attack"], desc: "Chalk on his boots: pace in behind and crosses from the byline.", att: 0.75, def: 0.25, build: 0.35, press: 0.20, create: 0.45 },
  ],
  ST: [
    { key: "POA", label: "Poacher", duties: ["Attack"], desc: "Lives on the last defender's shoulder. Does little outside the box and scores inside it.", att: 0.95, def: 0.10, build: 0.20, press: 0.15, create: 0.15 },
    { key: "TM", label: "Target man", duties: ["Support", "Attack"], desc: "Wins it in the air, holds it up with his back to goal and brings the runners in.", att: 0.75, def: 0.20, build: 0.50, press: 0.25, create: 0.35 },
    { key: "F9", label: "False nine", duties: ["Support"], desc: "Drops into midfield, pulls a centre-back with him and leaves the space for others.", att: 0.55, def: 0.25, build: 0.70, press: 0.30, create: 0.75 },
    { key: "PF", label: "Press-first striker", duties: ["Attack", "Defend"], desc: "The first defender: chases centre-backs into hurried clearances and forces mistakes high up the pitch.", att: 0.70, def: 0.40, build: 0.35, press: 0.85, create: 0.20 },
    { key: "DLF", label: "Link forward", duties: ["Support"], desc: "Drops short to link the play, then feeds the runners going past him.", att: 0.65, def: 0.25, build: 0.65, press: 0.25, create: 0.60 },
    { key: "CF", label: "All-round forward", duties: ["Support", "Attack"], desc: "Scores, makes chances, holds it up and presses from the front.", att: 0.85, def: 0.25, build: 0.55, press: 0.35, create: 0.55 },
  ],
};

export const DUTY_INFO = {
  Defend: { label: "Hold", desc: "Keeps his position and covers behind the ball. Joins an attack late, if at all.", attMul: 0.72, defMul: 1.28 },
  Support: { label: "Link", desc: "Plays between the boxes, connecting defence and attack without committing to either.", attMul: 1.00, defMul: 1.00 },
  Attack: { label: "Push", desc: "Gets forward in numbers and takes risks, leaving less cover behind him.", attMul: 1.32, defMul: 0.70 },
};

export function defaultRoleFor(slotType) { return ROLES[slotType][0]; }
export function defaultDutyFor(role) { return role.duties.includes("Support") ? "Support" : role.duties[0]; }
