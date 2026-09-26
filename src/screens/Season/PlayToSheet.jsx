import { useState } from "react";
import Button from "../../ui/Button.jsx";
import ChipRow from "../../ui/ChipRow.jsx";
import Sheet from "../../ui/Sheet.jsx";
import { HALF_SEASON, SEASON_WEEKS } from "../../engine/season.js";
import { t } from "../../content/t.js";
import styles from "./Season.module.css";

export function playToOptions(week) {
  const beforeHalf = week <= HALF_SEASON;
  const stop = beforeHalf ? HALF_SEASON : SEASON_WEEKS;
  const options = [{ key: "next", label: "Next match", sub: `Week ${week}` }];
  if (beforeHalf) options.push({ key: "half", label: "The half", sub: week === HALF_SEASON ? `Week ${HALF_SEASON}` : `Weeks ${week}–${HALF_SEASON}` });
  options.push({ key: "defeat", label: "The next defeat", sub: `Or week ${stop}` });
  options.push({ key: "end", label: "The end of the season", sub: week === SEASON_WEEKS ? `Week ${SEASON_WEEKS}` : `Weeks ${week}–${SEASON_WEEKS}` });
  return options;
}

export default function PlayToSheet({ open, onClose, week, onPlay }) {
  const [until, setUntil] = useState("next");
  const options = playToOptions(week);
  const choice = options.some((o) => o.key === until) ? until : "next";
  const play = () => { onPlay(choice); onClose(); };
  return (
    <Sheet open={open} onClose={onClose} title={t("season.playTo")}
      footer={<Button block onClick={play}>Play</Button>}>
      <p className={styles.lede}>The board plays as it stands now for every match in the run.</p>
      <ChipRow label="Play to" options={options} value={choice} onChange={setUntil} />
    </Sheet>
  );
}
