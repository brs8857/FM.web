import { useState } from "react";
import Button from "../../ui/Button.jsx";
import Disclosure from "../../ui/Disclosure.jsx";
import Table from "../../ui/Table.jsx";
import Ticker from "../../ui/Ticker.jsx";
import Toast from "../../ui/Toast.jsx";
import { ShareIcon } from "../../ui/icons.jsx";
import Strengths from "../Board/Strengths.jsx";
import { careerSeasonLabel, CAREER_SEASONS } from "../../engine/season.js";
import { tierLabel } from "../../content/labels.js";
import { t } from "../../content/t.js";
import { useMediaQuery } from "../../app/useMediaQuery.js";
import { RAIL_QUERY } from "../../app/Shell.jsx";
import { shareSlip } from "../../app/share.js";
import { resultLine, ordinal } from "./Vidiprinter.jsx";
import styles from "./Season.module.css";

const COLUMNS = [
  { key: "position", label: "#", mono: true },
  { key: "name", label: "Club" },
  { key: "pts", label: "Pts", align: "right", mono: true },
];

export function slipFor(state, code) {
  const s = state.simulation;
  const tier = tierLabel(s.tier);
  return {
    kicker: `Season ${s.season} · ${careerSeasonLabel(s.season)}`,
    headline: tier.name,
    standfirst: tier.sub,
    record: `${t("season.record", s)} · ${s.pts} pts · ${ordinal(s.position)}`,
    eleven: state.assignments.map((a) => a.player?.name.split(" ").slice(-1)[0] ?? "—"),
    code,
    fileName: `era-xi-season-${s.season}`,
  };
}

// The back page (spec 04 §5.5): headline, standfirst, record, the table and
// matches under the fold, strengths, Share.
export default function BackPage({ state, careerCode, clubName, opponents }) {
  const rail = useMediaQuery(RAIL_QUERY);
  const [toast, setToast] = useState(null);
  const s = state.simulation;
  const tier = tierLabel(s.tier);
  const gd = s.gf - s.ga;
  const rows = s.table.map((r) => ({ ...r, name: r.isUser ? "Your XI" : clubName(r.name) }));
  const finalSeason = s.season >= CAREER_SEASONS;

  const share = async () => {
    try {
      const outcome = await shareSlip(slipFor(state, careerCode));
      if (outcome === "downloaded") setToast("Slip saved and the caption copied.");
    } catch {
      setToast("Sharing isn't available here.");
    }
  };

  return (
    <article className={styles.stack} aria-labelledby="backpage-headline">
      <div className={styles.backPage}>
        <p className={styles.kicker}>Season {s.season} · {careerSeasonLabel(s.season)}{finalSeason ? " · The last season" : ""}</p>
        <h2 id="backpage-headline" className={styles.headline}>{tier.name}</h2>
        <p className={styles.standfirst}>{tier.sub}</p>
        <p className={styles.mono}>{t("season.record", s)} · {s.pts} pts · Finished {ordinal(s.position)}</p>
        <p className={styles.mono}>Scored {s.gf} · Conceded {s.ga} · {gd >= 0 ? "+" : ""}{gd}</p>
        <Button variant="secondary" onClick={share}><ShareIcon /> Share</Button>
      </div>
      <Disclosure title="Final table" summary={`${ordinal(s.position)} of 20`} defaultOpen={rail}>
        <Table caption={`Final table · ${careerSeasonLabel(s.season)}`} captionHidden columns={COLUMNS} rows={rows} rowKey={(r) => r.name} isHighlighted={(r) => r.isUser} dense />
      </Disclosure>
      <Disclosure title="Matches" summary="All 38, in order">
        <Ticker lines={s.matches.map((m) => resultLine(m, clubName))} label="Results" />
      </Disclosure>
      <Strengths profile={s.profile} familiarity={s.familiarity} instructions={s.instructions} opponents={opponents} />
      <Toast open={Boolean(toast)} message={toast ?? ""} onClose={() => setToast(null)} />
    </article>
  );
}
