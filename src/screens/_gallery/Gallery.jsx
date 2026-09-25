import { useState } from "react";
import {
  Button, IconButton, Chip, ChipRow, Segmented, Toggle, Dial, Disclosure, Sheet, TabBar, TopBar, NextPill,
  Term, TermsProvider, Callout, Toast, Meter, StrengthBars, Stamp, Ticker, Cutting, TeamSheetRow, Slip, Table,
  LiveRegion, useAnnounce, CloseIcon, InfoIcon,
} from "../../ui/index.js";
import { CLUBS, clubTheme, clubThemeVars } from "../../content/clubTheme.js";
import styles from "./Gallery.module.css";

// Manual gallery for the primitive library, at ?gallery=1. Renders
// every primitive in both themes side by side, under the pitch theme or
// any club's derived colours. Not a Storybook; no deps.

const TERMS = {
  cohesion: { title: "Cohesion", body: "How well the eleven know the system.\n\nEach player's [[brief]] shapes it." },
  brief: { title: "Brief", body: "Hold, Link or Push: how far forward a player is asked to play." },
  tempo: { title: "Tempo", body: "How quickly the ball moves once you have it." },
};

const TABS = [
  { key: "squad", label: "Squad" }, { key: "board", label: "Board" }, { key: "season", label: "Season", badge: true }, { key: "club", label: "Club" },
];

const STYLE_OPTIONS = [
  { key: "gegenpress", label: "Gegenpress" }, { key: "possession", label: "Possession" }, { key: "counter", label: "Low block counter" },
  { key: "balanced", label: "Blank slate", sub: "no identity bonus" },
];

const TICKER_LINES = [
  { id: 1, text: "WK 10  LEEDS (H)      2-0", tone: "win" },
  { id: 2, text: "WK 11  ARSENAL (A)    1-1", tone: "draw" },
  { id: 3, text: "WK 12  SPURS (H)      0-2", tone: "loss" },
];

const TABLE_COLUMNS = [
  { key: "position", label: "#", mono: true },
  { key: "name", label: "Club" },
  { key: "pts", label: "Pts", align: "right", mono: true },
];
const TABLE_ROWS = [
  { position: 1, name: "Rival 1", pts: 88 }, { position: 2, name: "Your XI", pts: 84, isUser: true }, { position: 3, name: "Rival 4", pts: 79 },
];

function Section({ title, children }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>{title}</h2>
      <div className={styles.body}>{children}</div>
    </section>
  );
}

function Samples() {
  const [style, setStyle] = useState("possession");
  const [theme, setTheme] = useState("system");
  const [trap, setTrap] = useState(false);
  const [tempo, setTempo] = useState(55);
  const [sheet, setSheet] = useState(false);
  const [tab, setTab] = useState("board");
  const [toast, setToast] = useState(false);
  const [note, setNote] = useState(true);
  const [stamp, setStamp] = useState(84);
  const announce = useAnnounce();

  return (
    <>
      <Section title="Button, IconButton">
        <div className={styles.row}>
          <Button>Kick off</Button>
          <Button variant="secondary">Open the window</Button>
          <Button variant="ghost">Skip</Button>
          <Button disabled>Draw</Button>
          <Button size="sm">Redraw</Button>
          <IconButton label="Close"><CloseIcon /></IconButton>
          <IconButton label="Info" size="sm"><InfoIcon /></IconButton>
        </div>
      </Section>

      <Section title="Chip, ChipRow, Segmented, Toggle">
        <div className={styles.row}>
          <Chip selected>Gegenpress</Chip>
          <Chip>Possession</Chip>
          <Chip tone="signal" selected sub="live">Season 3</Chip>
        </div>
        <ChipRow label="Style" options={STYLE_OPTIONS} value={style} onChange={setStyle} />
        <Segmented label="Theme" options={[{ key: "system", label: "System" }, { key: "light", label: "Light" }, { key: "dark", label: "Dark" }]} value={theme} onChange={setTheme} />
        <Toggle label="Offside trap" sub="Needs a high line" checked={trap} onChange={setTrap} />
      </Section>

      <Section title="Dial, Disclosure">
        <Dial label="Tempo" value={tempo} onChange={setTempo} leftLabel="Slow" rightLabel="Fast" valueLabel={tempo >= 60 ? "Quick" : "Measured"} term="tempo" />
        <Disclosure title="In possession" summary="Short · Narrow · Cross late">
          <Dial label="Directness" value={40} onChange={() => {}} leftLabel="Short" rightLabel="Direct" />
        </Disclosure>
      </Section>

      <Section title="Sheet, Term, Callout, Toast">
        <div className={styles.row}>
          <Button variant="secondary" onClick={() => setSheet(true)}>Open sheet</Button>
          <Button variant="secondary" onClick={() => setToast(true)}>Show toast</Button>
          <Button variant="secondary" onClick={() => announce("Tony Adams moved to centre-back")}>Announce</Button>
        </div>
        <p>Your <Term term="cohesion">cohesion</Term> is Rough. Each <Term term="brief">brief</Term> matters.</p>
        {note && <Callout title="Coach's note" onDismiss={() => setNote(false)}>Tap a row to see the player sheet.</Callout>}
        <Sheet open={sheet} onClose={() => setSheet(false)} title="Cohesion" footer={<Button onClick={() => setSheet(false)}>Done</Button>}>
          <p>A sheet with a nested <Term term="brief">term</Term>.</p>
        </Sheet>
        <Toast open={toast} message="Career code copied" action="Undo" onAction={() => setToast(false)} onClose={() => setToast(false)} />
      </Section>

      <Section title="TabBar, TopBar, NextPill">
        <TopBar title="Board" subtitle="Season 3 · 2028-29" onBack={() => {}} next={<NextPill label="Kick off season 3" onClick={() => {}} />} />
        <TabBar tabs={TABS} value={tab} onChange={setTab} />
        <div className={styles.rail}><TabBar tabs={TABS} value={tab} onChange={setTab} orientation="vertical" /></div>
      </Section>

      <Section title="Meter, StrengthBars, Stamp">
        <Meter label="Cohesion" value={63} valueLabel="Settled" />
        <StrengthBars bars={[
          { key: "attack", label: "Attack", value: 72, reference: 65 }, { key: "creativity", label: "Creativity", value: 58, reference: 62 },
          { key: "buildup", label: "Build-up", value: 66, reference: 60 }, { key: "press", label: "Press", value: 81, reference: 64 },
          { key: "defence", label: "Defence", value: 55, reference: 63 }, { key: "physical", label: "Physical", value: 70, reference: 66 },
        ]} />
        <div className={styles.row}>
          <Stamp value={stamp} label="Squad average" />
          <Stamp value="W" tone="win" size="md" />
          <Stamp value="L" tone="loss" size="md" />
          <Button size="sm" variant="secondary" onClick={() => setStamp((s) => s + 1)}>Stamp again</Button>
        </div>
      </Section>

      <Section title="Ticker, Cutting, TeamSheetRow">
        <Ticker lines={TICKER_LINES} cursor />
        <div className={styles.cuttings}>
          <Cutting kicker="Club season" title="Leeds United 2000-01" subtitle="2 centre-backs" onOpen={() => {}} />
          <Cutting kicker="Club season" title="Arsenal 1997-98" subtitle="3 centre-backs" selected onOpen={() => {}} />
          <Cutting kicker="Club season" title="Wimbledon 1993-94" subtitle="Showing everyone" note="No centre-backs in this squad" onOpen={() => {}} />
        </div>
        <ul className={styles.sheet}>
          <TeamSheetRow code="GK" name="David Seaman" meta="34 · England" job="Line keeper · Hold" onClick={() => {}} />
          <TeamSheetRow code="CB" name="Tony Adams" meta="31 · England" job="Blocker · Hold" selected onClick={() => {}} />
          <TeamSheetRow code="ST" name="Alan Smith" meta="25 · England" mark={{ label: "off", title: "Not a centre-back" }} onClick={() => {}} />
        </ul>
      </Section>

      <Section title="Slip, Table">
        <Slip kicker="Season 3 · 2028-29" title="Half-season slip">
          <p>Won 9, drawn 5, lost 5 · 4th · 32 pts</p>
        </Slip>
        <Table caption="Final table" columns={TABLE_COLUMNS} rows={TABLE_ROWS} rowKey={(r) => r.name} isHighlighted={(r) => r.isUser} dense />
      </Section>
    </>
  );
}

export default function Gallery() {
  const [club, setClub] = useState("");
  const theme = club ? clubTheme(club) : null;
  const name = CLUBS.find((c) => c.key === club)?.name;
  return (
    <TermsProvider terms={TERMS}>
      <LiveRegion>
        <div className={styles.gallery}>
          <label className={styles.toolbar}>
            <span>Colours</span>
            <select value={club} onChange={(e) => setClub(e.target.value)} className={styles.select}>
              <option value="">Pitch</option>
              {CLUBS.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
            </select>
          </label>
          <div className={styles.column} data-theme="light" data-testid="gallery-light" style={theme ? clubThemeVars(theme.light) : undefined}>
            <h1 className={styles.title}>Pitch</h1>
            {name && <p className={styles.club}>{name} · light</p>}
            <Samples />
          </div>
          <div className={styles.column} data-theme="dark" data-testid="gallery-dark" style={theme ? clubThemeVars(theme.dark) : undefined}>
            <h1 className={styles.title}>Floodlit</h1>
            {name && <p className={styles.club}>{name} · dark</p>}
            <Samples />
          </div>
        </div>
      </LiveRegion>
    </TermsProvider>
  );
}
