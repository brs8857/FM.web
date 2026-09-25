import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ClubTab from "./ClubTab.jsx";
import { recordSummary } from "./Record.jsx";
import { TermsProvider } from "../../ui/Term.jsx";
import terms from "../../content/terms.json";
import { encodeCareerCode } from "../../app/careerCode.js";
import { DEFAULT_PREFS } from "../../state/prefs.js";

const history = [
  { season: 1, position: 4, pts: 70, w: 20, d: 10, l: 8, gf: 60, ga: 40, tier: "Champions League", identity: "Gegenpress", familiarity: 60, seed: 1 },
  { season: 2, position: 1, pts: 88, w: 27, d: 7, l: 4, gf: 80, ga: 30, tier: "Champions", identity: null, familiarity: 75, seed: 1 },
  { season: 3, position: 2, pts: 84, w: 25, d: 9, l: 0, gf: 70, ga: 25, tier: "Champions League", identity: "Possession Control", familiarity: 80, seed: 1 },
];
const code = encodeCareerCode({ seed: 4242, eraMin: 2000, eraMax: 2011, formationKey: "4-3-3" });

function renderClub(props = {}) {
  const handlers = {
    onDismissNote: vi.fn(), setPrefs: vi.fn(), onExport: vi.fn(), onImportFile: vi.fn(() => Promise.resolve({ ok: false, message: "That file is damaged." })),
    onStartFromCode: vi.fn(), onNewCareer: vi.fn(), ...props,
  };
  render(
    <TermsProvider terms={terms}>
      <ClubTab history={history} careerComplete={false} careerCode={code} prefs={DEFAULT_PREFS} canExport storageAvailable {...handlers} />
    </TermsProvider>,
  );
  return handlers;
}

afterEach(() => vi.restoreAllMocks());

describe("Record", () => {
  it("summarises best finish, titles and unbeaten seasons", () => {
    expect(recordSummary([])).toBeNull();
    const s = recordSummary(history);
    expect(s.best.season).toBe(2);
    expect(s.titles).toBe(1);
    expect(s.unbeaten).toBe(1);
    expect(s.points).toBe(242);
  });
});

describe("ClubTab", () => {
  it("shows the record with the renamed verdicts, best finish and titles", () => {
    renderClub();
    expect(screen.getByText("1st · 2027-28")).toBeTruthy();
    expect(screen.getByText("1 title")).toBeTruthy();
    expect(screen.getAllByRole("row")).toHaveLength(4);
    expect(screen.getAllByText("Top five")).toHaveLength(2);
    expect(screen.getByText("Bespoke")).toBeTruthy();
  });

  it("copies the career code and starts a career from a typed one, rejecting bad codes", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.assign(navigator, { clipboard: { writeText } });
    const { onStartFromCode } = renderClub();
    expect(screen.getByTestId("career-code").textContent).toBe(code);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledWith(code);
    expect(await screen.findByText("Career code copied")).toBeTruthy();
    const input = screen.getByLabelText("Start a career from a code");
    fireEvent.change(input, { target: { value: "not a code" } });
    fireEvent.click(screen.getByRole("button", { name: "Start from code" }));
    expect(screen.getByRole("alert").textContent).toMatch(/doesn't look like a career code/);
    expect(onStartFromCode).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: code.toLowerCase() } });
    fireEvent.click(screen.getByRole("button", { name: "Start from code" }));
    expect(onStartFromCode).toHaveBeenCalledWith({ seed: 4242, eraMin: 2000, eraMax: 2011, formationKey: "4-3-3" });
  });

  it("exports and imports from the Saves section and shows the import message", async () => {
    const { onExport, onImportFile } = renderClub();
    fireEvent.click(screen.getByRole("button", { name: "Saves" }));
    fireEvent.click(screen.getByRole("button", { name: "Export save" }));
    expect(onExport).toHaveBeenCalledOnce();
    const file = new File(["x"], "x.json");
    fireEvent.change(screen.getByTestId("import-save-input"), { target: { files: [file] } });
    expect(onImportFile).toHaveBeenCalledWith(file);
    expect(await screen.findByText("That file is damaged.")).toBeTruthy();
  });

  it("shows the record as a slip with a new-career button when the career is complete", () => {
    const onNewCareer = vi.fn();
    render(
      <TermsProvider terms={terms}>
        <ClubTab history={history} careerComplete careerCode={code} prefs={DEFAULT_PREFS} setPrefs={() => {}} onDismissNote={() => {}} canExport storageAvailable
          onExport={() => {}} onImportFile={() => {}} onStartFromCode={() => {}} onNewCareer={onNewCareer} />
      </TermsProvider>,
    );
    expect(screen.getByRole("heading", { name: "2026-27 to 2031-32" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Start a new career" }));
    expect(onNewCareer).toHaveBeenCalledOnce();
  });
});
