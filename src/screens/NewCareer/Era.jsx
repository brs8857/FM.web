import { useMemo } from "react";
import ChipRow from "../../ui/ChipRow.jsx";
import { Term } from "../../ui/Term.jsx";
import RangeSlider from "./RangeSlider.jsx";
import { seasonLabel } from "../../engine/util.js";
import { selectEraIndex } from "../../state/selectors.js";
import { t } from "../../content/t.js";
import styles from "./Era.module.css";

import { ERAS } from "../../state/initialState.js";

export const ERA_PRESETS = {
  top: [
    { key: "all", label: "Full history", min: 1992, max: 2025 },
    { key: "90s", label: "The '90s", min: 1992, max: 1999 },
    { key: "2000s", label: "The 2000s", min: 2000, max: 2009 },
    { key: "2010s", label: "The 2010s", min: 2010, max: 2019 },
    { key: "modern", label: "Modern era", min: 2020, max: 2025 },
  ],
  championship: [
    { key: "all", label: "Since 2016", min: 2016, max: 2025 },
    { key: "2010s", label: "The late 2010s", min: 2016, max: 2019 },
    { key: "modern", label: "The 2020s", min: 2020, max: 2025 },
  ],
};

const LEDE = {
  top: "Every pick draws three club-seasons from this range. Narrow it for a squad that could have played together; widen it for the whole archive.",
  championship: "Every pick draws three Championship club-seasons from this range, from 2016-17 on. Narrow it for a squad that could have played together.",
};

export default function Era({ league = "top", eraMin, eraMax, index, onSetEra }) {
  const presets = ERA_PRESETS[league];
  const preset = presets.find((p) => p.min === eraMin && p.max === eraMax)?.key ?? "custom";
  const count = useMemo(() => selectEraIndex(index, eraMin, eraMax).length, [index, eraMin, eraMax]);
  return (
    <div className={styles.era}>
      <h2 className={styles.heading}>Which <Term term="era">years</Term>?</h2>
      <p className={styles.lede}>{LEDE[league]}</p>
      <ChipRow label="Era presets" options={presets} value={preset} onChange={(key) => {
        const p = presets.find((o) => o.key === key);
        onSetEra(p.min, p.max);
      }} />
      <p className={styles.range}>
        <span className={styles.years}>{seasonLabel(eraMin)} to {seasonLabel(eraMax)}</span>
        <span className={styles.count}>{t("era.count", { count })}</span>
      </p>
      <RangeSlider label="Era" min={ERAS[league].min} max={ERAS[league].max} valueMin={eraMin} valueMax={eraMax} onChange={onSetEra} format={seasonLabel} />
    </div>
  );
}
