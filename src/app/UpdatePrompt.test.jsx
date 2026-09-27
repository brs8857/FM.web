import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import UpdatePrompt, { LAUNCH_MS } from "./UpdatePrompt.jsx";
import { useInstallPrompt, isIosSafari } from "./useInstallPrompt.js";
import { renderHook } from "@testing-library/react";

describe("UpdatePrompt", () => {
  it("applies a version that is ready while the app opens, before anything is played", () => {
    let needRefresh;
    const updateSW = vi.fn();
    const register = vi.fn(({ onNeedRefresh }) => { needRefresh = onNeedRefresh; return updateSW; });
    let now = 1000;
    render(<UpdatePrompt register={register} clock={() => now} />);
    now += 3000;
    act(() => needRefresh());
    expect(updateSW).toHaveBeenCalledWith(true);
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("once play has begun, shows Update available with Reload and never reloads by itself", () => {
    let needRefresh;
    const updateSW = vi.fn();
    const register = vi.fn(({ onNeedRefresh }) => { needRefresh = onNeedRefresh; return updateSW; });
    let now = 1000;
    render(<UpdatePrompt register={register} clock={() => now} />);
    expect(screen.getByRole("status").textContent).toBe("");
    now += LAUNCH_MS + 1;
    act(() => needRefresh());
    expect(screen.getByRole("status").textContent).toContain("Update available");
    expect(updateSW).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Reload" }));
    expect(updateSW).toHaveBeenCalledWith(true);
  });

  it("looks for a new version each time the app comes back to the front", () => {
    const registration = { update: vi.fn() };
    const register = vi.fn(({ onRegisteredSW }) => { onRegisteredSW("sw.js", registration); return vi.fn(); });
    const doc = Object.assign(new EventTarget(), { visibilityState: "hidden" });
    const { unmount } = render(<UpdatePrompt register={register} doc={doc} />);
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(registration.update).not.toHaveBeenCalled();
    doc.visibilityState = "visible";
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(registration.update).toHaveBeenCalledOnce();
    unmount();
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(registration.update).toHaveBeenCalledOnce();
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
