import { useMemo } from "react";
import ChipRow from "../../ui/ChipRow.jsx";
import { Term } from "../../ui/Term.jsx";
import RangeSlider from "./RangeSlider.jsx";
import { seasonLabel } from "../../engine/util.js";
import { selectEraIndex } from "../../state/selectors.js";
import { t } from "../../content/t.js";
import styles from "./Era.module.css";

export const ERA_MIN = 1992;
export const ERA_MAX = 2024;
export const ERA_PRESETS = [
  { key: "all", label: "Full history", min: 1992, max: 2024 },
  { key: "90s", label: "The '90s", min: 1992, max: 1999 },
  { key: "2000s", label: "The 2000s", min: 2000, max: 2009 },
  { key: "2010s", label: "The 2010s", min: 2010, max: 2019 },
  { key: "modern", label: "Modern era", min: 2020, max: 2024 },
];

// New career, step 1 (spec 04 §4.1): the seasons the draw comes from.
export default function Era({ eraMin, eraMax, index, onSetEra }) {
  const preset = ERA_PRESETS.find((p) => p.min === eraMin && p.max === eraMax)?.key ?? "custom";
  const count = useMemo(() => selectEraIndex(index, eraMin, eraMax).length, [index, eraMin, eraMax]);
  return (
    <div className={styles.era}>
      <h2 className={styles.heading}>Choose your <Term term="era">era</Term></h2>
      <p className={styles.lede}>Every pick draws three club-seasons from this range. Narrow it for a squad that could have played together; widen it for the whole archive.</p>
      <ChipRow label="Era presets" options={ERA_PRESETS} value={preset} onChange={(key) => {
        const p = ERA_PRESETS.find((o) => o.key === key);
        onSetEra(p.min, p.max);
      }} />
      <p className={styles.range}>
        <span className={styles.years}>{seasonLabel(eraMin)} to {seasonLabel(eraMax)}</span>
        <span className={styles.count}>{t("era.count", { count })}</span>
      </p>
      <RangeSlider label="Era" min={ERA_MIN} max={ERA_MAX} valueMin={eraMin} valueMax={eraMax} onChange={onSetEra} format={seasonLabel} />
    </div>
  );
}
