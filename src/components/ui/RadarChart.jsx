import { clamp } from "../../engine/util.js";

/* Hexagonal radar chart for the six team phase attributes, drawn as raw SVG. */
export default function RadarChart({ data }) {
  // data: [{label, value}] length 6, value 0-100
  const size = 220, cx = size / 2, cy = size / 2, R = 82;
  const n = data.length;
  const pt = (i, r) => {
    const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
  };
  const rings = [0.25, 0.5, 0.75, 1];
  const poly = (r) => data.map((_, i) => pt(i, r * R).join(",")).join(" ");
  const valuePoly = data.map((d, i) => pt(i, (clamp(d.value, 0, 100) / 100) * R).join(",")).join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full mx-auto" style={{ maxWidth: "280px" }}>
      {rings.map((r, i) => (
        <polygon key={i} points={poly(r)} fill="none" stroke="#2a332e" strokeWidth="1" />
      ))}
      {data.map((_, i) => {
        const [x, y] = pt(i, R);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#2a332e" strokeWidth="1" />;
      })}
      <polygon points={valuePoly} fill="#10b981" fillOpacity="0.22" stroke="#10b981" strokeWidth="2" />
      {data.map((d, i) => {
        const [x, y] = pt(i, R + 20);
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="fill-green-300" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>
            {d.label}
          </text>
        );
      })}
      {data.map((d, i) => {
        const [x, y] = pt(i, (clamp(d.value, 0, 100) / 100) * R);
        return <circle key={i} cx={x} cy={y} r="3" fill="#10b981" />;
      })}
    </svg>
  );
}
