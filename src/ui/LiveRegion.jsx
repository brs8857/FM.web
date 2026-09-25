import { createContext, useCallback, useContext, useMemo, useState } from "react";

const AnnounceContext = createContext(() => {});

// One polite live region for the whole app. `useAnnounce()` returns a function
// that speaks a message (moves, swaps, draws, results); repeating the same
// message still announces because each call remounts the text.
export default function LiveRegion({ children }) {
  const [message, setMessage] = useState({ text: "", n: 0 });
  const announce = useCallback((text) => setMessage((m) => ({ text, n: m.n + 1 })), []);
  const value = useMemo(() => announce, [announce]);
  return (
    <AnnounceContext.Provider value={value}>
      {children}
      <div role="status" aria-live="polite" aria-atomic="true" className="visually-hidden" data-testid="live-region">
        <span key={message.n}>{message.text}</span>
      </div>
    </AnnounceContext.Provider>
  );
}

export function useAnnounce() {
  return useContext(AnnounceContext);
}
