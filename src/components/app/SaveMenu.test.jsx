import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SaveMenu from "./SaveMenu.jsx";

function openMenu(props = {}) {
  const handlers = { onExport: vi.fn(), onImportFile: vi.fn(() => Promise.resolve({ ok: true, message: "Loaded Season 3 · 2028-29." })), ...props };
  render(<SaveMenu canExport version="1.1.0" {...handlers} />);
  fireEvent.click(screen.getByRole("button", { name: "Menu" }));
  return handlers;
}

describe("SaveMenu", () => {
  it("exports from the menu", () => {
    const { onExport } = openMenu();
    expect(screen.getByText("FM.WEB v1.1.0")).toBeTruthy();
    fireEvent.click(screen.getByRole("menuitem", { name: "Export save" }));
    expect(onExport).toHaveBeenCalledOnce();
  });

  it("disables export when there is no career yet", () => {
    render(<SaveMenu canExport={false} version="1.1.0" onExport={vi.fn()} onImportFile={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByRole("menuitem", { name: "Export save" }).disabled).toBe(true);
  });

  it("shows the reason when an import is rejected", async () => {
    const onImportFile = vi.fn(() => Promise.resolve({ ok: false, reason: "This isn't an FM.WEB save." }));
    openMenu({ onImportFile });
    const file = new File(["x"], "x.json");
    fireEvent.change(screen.getByTestId("import-save-input"), { target: { files: [file] } });
    expect(await screen.findByText("This isn't an FM.WEB save.")).toBeTruthy();
    expect(onImportFile).toHaveBeenCalledWith(file);
  });
});
