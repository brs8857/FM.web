import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Term, TermsProvider } from "./Term.jsx";

const terms = {
  cohesion: { title: "Cohesion", body: "How well the eleven know the system.\n\nA player's [[brief]] matters too, as does [[job|the job]]." },
  brief: { title: "Brief", body: "Hold, Link or Push." },
  job: { title: "Job", body: "What the player is asked to do." },
};

describe("Term", () => {
  it("opens a definition sheet and nests further terms", () => {
    render(<TermsProvider terms={terms}><p>Your <Term term="cohesion">cohesion</Term> is Rough.</p></TermsProvider>);
    const trigger = screen.getByRole("button", { name: "cohesion" });
    expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
    fireEvent.click(trigger);
    const sheet = screen.getByRole("dialog", { name: "Cohesion" });
    expect(sheet.textContent).toContain("How well the eleven know the system.");
    fireEvent.click(screen.getByRole("button", { name: "the job" }));
    expect(screen.getByRole("dialog", { name: "Job" }).textContent).toContain("What the player is asked to do.");
    expect(screen.getAllByRole("dialog")).toHaveLength(2);
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Job" }), { key: "Escape" });
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Brief" }));
    expect(screen.getByRole("dialog", { name: "Brief" })).toBeTruthy();
  });

  it("renders as an info icon button when asked", () => {
    render(<TermsProvider terms={terms}><Term term="brief" icon label="Brief" /></TermsProvider>);
    fireEvent.click(screen.getByRole("button", { name: "About Brief" }));
    expect(screen.getByRole("dialog", { name: "Brief" })).toBeTruthy();
  });

  it("falls back to plain text when the term has no definition", () => {
    render(<TermsProvider terms={terms}><Term term="unknown">mystery</Term></TermsProvider>);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("mystery")).toBeTruthy();
  });
});
