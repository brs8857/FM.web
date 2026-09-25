import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import IconButton from "./IconButton.jsx";
import { CloseIcon } from "./icons.jsx";
import { cx } from "./cx.js";
import styles from "./Sheet.module.css";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const SWIPE_CLOSE_PX = 80;
let openCount = 0;

function focusables(root) {
  return root ? [...root.querySelectorAll(FOCUSABLE)] : [];
}

// Bottom sheet: a modal dialog with a focus trap, Escape, backdrop tap and a
// swipe-down of more than 80 px to close. Focus returns to the opener on close.
// Sheets nest (a Term inside a Term): each handles its own Escape and stops it.
export default function Sheet({ open, onClose, title, children, footer, size = "md" }) {
  const panelRef = useRef(null);
  const openerRef = useRef(null);
  const titleId = useId();
  const [dragY, setDragY] = useState(0);
  const dragStart = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    openerRef.current = document.activeElement;
    openCount += 1;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      openCount -= 1;
      if (openCount === 0) document.body.style.overflow = "";
      const opener = openerRef.current;
      if (opener && typeof opener.focus === "function" && document.contains(opener)) opener.focus();
    };
  }, [open]);

  if (!open) return null;

  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const items = focusables(panelRef.current);
    if (items.length === 0) { event.preventDefault(); return; }
    const first = items[0], last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === panelRef.current)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
  };

  const onPointerDown = (event) => {
    dragStart.current = event.clientY;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event) => {
    if (dragStart.current === null) return;
    setDragY(Math.max(0, event.clientY - dragStart.current));
  };
  const onPointerUp = (event) => {
    if (dragStart.current === null) return;
    const travelled = event.clientY - dragStart.current;
    dragStart.current = null;
    setDragY(0);
    if (travelled > SWIPE_CLOSE_PX) onClose();
  };

  return createPortal(
    <div className={styles.backdrop} onClick={onClose} data-testid="sheet-backdrop">
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} ref={panelRef} tabIndex={-1}
        className={cx(styles.panel, styles[size], "slip")} onClick={(e) => e.stopPropagation()} onKeyDown={onKeyDown}
        style={dragY ? { transform: `translateY(${dragY}px)`, transition: "none" } : undefined}>
        <div className={styles.grip} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <span className={styles.handle} aria-hidden="true" />
        </div>
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>{title}</h2>
          <IconButton label="Close" onClick={onClose}><CloseIcon /></IconButton>
        </header>
        <div className={styles.body}>{children}</div>
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
