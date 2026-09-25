import { createContext, useContext, useState } from "react";
import Sheet from "./Sheet.jsx";
import IconButton from "./IconButton.jsx";
import { InfoIcon } from "./icons.jsx";
import { cx } from "./cx.js";
import styles from "./Term.module.css";

const TermsContext = createContext({});

export function TermsProvider({ terms, children }) {
  return <TermsContext.Provider value={terms}>{children}</TermsContext.Provider>;
}

export function useTerms() {
  return useContext(TermsContext);
}

// Definitions may reference other terms as [[key]] or [[key|shown text]];
// those render as nested Terms, each opening its own sheet.
const LINK = /\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g;

export function Definition({ text }) {
  const terms = useTerms();
  return text.split(/\n\n+/).map((paragraph, p) => {
    const parts = [];
    let last = 0;
    for (const match of paragraph.matchAll(LINK)) {
      parts.push(paragraph.slice(last, match.index));
      const [, key, shown] = match;
      parts.push(<Term key={`${p}-${match.index}`} term={key}>{shown ?? terms[key]?.title ?? key}</Term>);
      last = match.index + match[0].length;
    }
    parts.push(paragraph.slice(last));
    return <p key={p} className={styles.paragraph}>{parts}</p>;
  });
}

export function Term({ term, icon = false, label, className, children }) {
  const terms = useTerms();
  const [open, setOpen] = useState(false);
  const entry = terms[term];
  const title = entry?.title ?? label ?? children;
  if (!entry) return <span className={className}>{children ?? label ?? term}</span>;
  return (
    <>
      {icon ? (
        <IconButton label={`About ${label ?? title}`} size="sm" aria-haspopup="dialog" onClick={() => setOpen(true)} className={className}>
          <InfoIcon />
        </IconButton>
      ) : (
        <button type="button" className={cx(styles.term, className)} aria-haspopup="dialog" onClick={() => setOpen(true)}>
          {children ?? title}
        </button>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title={title}>
        <Definition text={entry.body} />
      </Sheet>
    </>
  );
}

export default Term;
