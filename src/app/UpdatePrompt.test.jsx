import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import UpdatePrompt from "./UpdatePrompt.jsx";
import { useInstallPrompt, isIosSafari } from "./useInstallPrompt.js";
import { renderHook } from "@testing-library/react";

describe("UpdatePrompt", () => {
  it("shows Update available with Reload once a worker is waiting, and never reloads by itself", () => {
    let needRefresh;
    const updateSW = vi.fn();
    const register = vi.fn(({ onNeedRefresh }) => { needRefresh = onNeedRefresh; return updateSW; });
    render(<UpdatePrompt register={register} />);
    expect(screen.getByRole("status").textContent).toBe("");
    act(() => needRefresh());
    expect(screen.getByRole("status").textContent).toContain("Update available");
    expect(updateSW).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Reload" }));
    expect(updateSW).toHaveBeenCalledWith(true);
  });

  it("renders nothing without a register function (standalone build)", () => {
    render(<UpdatePrompt />);
    expect(screen.getByRole("status").textContent).toBe("");
  });
});

describe("useInstallPrompt", () => {
  it("captures beforeinstallprompt and prompts on demand", async () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.canInstall).toBe(false);
    const event = Object.assign(new Event("beforeinstallprompt"), { prompt: vi.fn(), userChoice: Promise.resolve({ outcome: "accepted" }) });
    act(() => { window.dispatchEvent(event); });
    expect(result.current.canInstall).toBe(true);
    await act(async () => { await result.current.install(); });
    expect(event.prompt).toHaveBeenCalledOnce();
    expect(result.current.canInstall).toBe(false);
  });

  it("recognises iOS Safari for the Add to Home Screen hint", () => {
    expect(isIosSafari({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1" })).toBe(true);
    expect(isIosSafari({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/118.0 Mobile/15E148 Safari/604.1" })).toBe(false);
    expect(isIosSafari({ userAgent: "Mozilla/5.0 (X11; Linux x86_64) Chrome/120" })).toBe(false);
  });
});
