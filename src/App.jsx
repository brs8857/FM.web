import { useState } from "react";
import { getStorage } from "./state/storage.js";
import { applyLayoutFlag } from "./state/prefs.js";
import LegacyApp from "./components/app/LegacyApp.jsx";
import V2Root from "./app/V2Root.jsx";

// Picks the tree by the `layout` preference. `?layout=v2` turns the redesign
// on for this device, `?layout=v1` turns it off (Phase 1 spec §10); the flag
// never touches game state or saves. B11 removes the switch and the v1 tree.
export default function FMWeb({ dataset, storage: storageProp, search }) {
  const [storage] = useState(() => (storageProp !== undefined ? storageProp : getStorage()));
  const [query] = useState(() => new URLSearchParams(search ?? (typeof window === "undefined" ? "" : window.location.search)));
  const [prefs] = useState(() => applyLayoutFlag(`?${query}`, storage));
  if (prefs.layout === "v2") {
    return <V2Root dataset={dataset} storage={storage} prefs={prefs} gallery={query.get("gallery") === "1"} />;
  }
  return <LegacyApp dataset={dataset} storage={storage} />;
}
