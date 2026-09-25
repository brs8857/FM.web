import { useEffect, useState } from "react";
import Toast from "../ui/Toast.jsx";

// "Update available · Reload" when a new service worker is waiting (Phase 1
// spec §7.1). It never reloads on its own. `register` is registerSW from
// virtual:pwa-register, passed in so this stays testable.
export default function UpdatePrompt({ register }) {
  const [update, setUpdate] = useState(null);
  useEffect(() => {
    if (!register) return;
    const updateSW = register({ onNeedRefresh: () => setUpdate(() => updateSW) });
  }, [register]);
  return <Toast open={Boolean(update)} message="Update available" action="Reload" duration={0} onAction={() => update?.(true)} onClose={() => setUpdate(null)} />;
}
