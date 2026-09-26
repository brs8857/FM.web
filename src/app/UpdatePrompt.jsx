import { useEffect, useState } from "react";
import Toast from "../ui/Toast.jsx";

// `register` is registerSW from virtual:pwa-register, passed in so the prompt
// can be tested without a service worker. It never reloads on its own.
export default function UpdatePrompt({ register }) {
  const [update, setUpdate] = useState(null);
  useEffect(() => {
    if (!register) return;
    const updateSW = register({ onNeedRefresh: () => setUpdate(() => updateSW) });
  }, [register]);
  return <Toast open={Boolean(update)} message="Update available" action="Reload" duration={0} onAction={() => update?.(true)} onClose={() => setUpdate(null)} />;
}
