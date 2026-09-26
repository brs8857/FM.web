export const DEFAULT_INSTRUCTIONS = {
  mentality: 50,       // 0 very defensive .. 100 very attacking (master dial)
  tempo: 50,           // 0 slow build-up .. 100 high tempo
  directness: 50,      // 0 short passing .. 100 long/direct
  width: 50,           // 0 narrow .. 100 wide
  focus: 50,           // 0 through the middle .. 100 down the flanks
  press: 50,           // 0 drop off .. 100 high press / high engagement line
  line: 50,            // 0 deep block .. 100 high line
  tackling: 50,        // 0 cautious .. 100 aggressive tackling
  counter: 50,         // 0 reset shape .. 100 sprint on the counter
  crossing: 50,        // 0 cut inside .. 100 cross early and often
  gkDistribution: 50,  // 0 play out short .. 100 go long
  offsideTrap: false,  // high-risk, high-reward defensive line trap
  marking: "zonal",    // 'zonal' | 'man'
  shape: "structured", // 'structured' | 'fluid'
};

// Each preset but Blank slate sits inside one of identitySynergy's templates.
export const STYLE_PRESETS = [
  { key: "gegenpress", label: "Gegenpress",
    instructions: { mentality: 62, tempo: 82, directness: 58, width: 58, focus: 50, press: 84, line: 76, tackling: 76, counter: 66, crossing: 52, gkDistribution: 58, offsideTrap: true, marking: "man", shape: "fluid" } },
  { key: "possession", label: "Possession Control",
    instructions: { mentality: 58, tempo: 42, directness: 20, width: 54, focus: 32, press: 52, line: 58, tackling: 42, counter: 22, crossing: 32, gkDistribution: 22, offsideTrap: false, marking: "zonal", shape: "structured" } },
  { key: "counter", label: "Low Block Counter",
    instructions: { mentality: 38, tempo: 55, directness: 64, width: 44, focus: 50, press: 30, line: 26, tackling: 55, counter: 82, crossing: 42, gkDistribution: 66, offsideTrap: false, marking: "zonal", shape: "structured" } },
  { key: "direct", label: "Direct & Vertical",
    instructions: { mentality: 60, tempo: 72, directness: 80, width: 58, focus: 60, press: 56, line: 55, tackling: 62, counter: 56, crossing: 58, gkDistribution: 78, offsideTrap: false, marking: "zonal", shape: "structured" } },
  { key: "parkbus", label: "Park The Bus",
    instructions: { mentality: 25, tempo: 38, directness: 55, width: 34, focus: 50, press: 24, line: 20, tackling: 48, counter: 34, crossing: 28, gkDistribution: 52, offsideTrap: false, marking: "zonal", shape: "structured" } },
  { key: "wingplay", label: "Wing Play",
    instructions: { mentality: 50, tempo: 60, directness: 48, width: 82, focus: 82, press: 55, line: 54, tackling: 50, counter: 44, crossing: 82, gkDistribution: 50, offsideTrap: false, marking: "zonal", shape: "fluid" } },
  { key: "balanced", label: "Blank slate",
    instructions: { ...DEFAULT_INSTRUCTIONS } },
];
