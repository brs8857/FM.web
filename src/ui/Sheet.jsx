import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import IconButton from "./IconButton.jsx";
import { CloseIcon } from "./icons.jsx";
import { cx } from "./cx.js";
import { rubberband, releaseVelocity, shouldDismiss, exitDuration } from "./gesture.js";
import styles from "./Sheet.module.css";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const EXIT_MS = 200;
const THROW = "cubic-bezier(0.2, 0.7, 0.4, 1)";
const now = () => performance.now();
let openCount = 0;

function focusables(root) {
  return root ? [...root.querySelectorAll(FOCUSABLE)] : [];
}

// Where the panel is on screen right now, entrance animation included, so a
// grab mid-flight carries on from there rather than from where it was going.
function liveOffset(panel) {
  const match = /matrix\(([^)]+)\)/.exec(getComputedStyle(panel).transform);
  return match ? Number(match[1].split(",")[5]) || 0 : 0;
}

// Sheets nest (a Term inside a Term), so each stops its own Escape.
// They rise from the bottom edge on a spring and leave the way they came; the
// grip drags one 1:1, resists upward, and lets go by where the flick was
// heading (gesture.js) at the finger's own speed.
export default function Sheet({ open, onClose, title, children, footer, size = "md" }) {
  const panelRef = useRef(null);
  const backdropRef = useRef(null);
  const openerRef = useRef(null);
  const titleId = useId();
  const drag = useRef(null);
  const swiped = useRef(false);
  const [leaving, setLeaving] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);

  // Closing keeps the panel on screen while it slides out, unless a swipe
  // already took it off. Worked out in the render that sees `open` change, so
  // the panel never drops out for a frame between the two.
  if (open !== wasOpen) {
    setWasOpen(open);
    setLeaving(!open && !swiped.current);
  }

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

  useEffect(() => {
    if (open) swiped.current = false;
  }, [open]);

  useEffect(() => {
    if (!leaving) return undefined;
    const timer = setTimeout(() => setLeaving(false), EXIT_MS);
    return () => clearTimeout(timer);
  }, [leaving]);

  if (!open && !leaving) return null;

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

  const place = (y, height) => {
    const panel = panelRef.current, backdrop = backdropRef.current;
    if (!panel) return;
    panel.style.transform = `translateY(${y}px)`;
    if (backdrop) backdrop.style.opacity = String(1 - Math.min(1, Math.max(0, y / height)) * 0.8);
  };

  const onPointerDown = (event) => {
    const panel = panelRef.current;
    if (!panel || event.button > 0) return;
    const height = panel.getBoundingClientRect().height || 1;
    const origin = liveOffset(panel);
    // Take over from whatever is moving it: cancel the entrance or a spring
    // back and hold it where it is.
    panel.style.animation = "none";
    panel.style.transition = "none";
    place(origin, height);
    drag.current = { startY: event.clientY, origin, height, y: origin, samples: [{ y: event.clientY, t: now() }] };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event) => {
    const d = drag.current;
    if (!d) return;
    d.samples.push({ y: event.clientY, t: now() });
    if (d.samples.length > 8) d.samples.shift();
    const raw = d.origin + (event.clientY - d.startY);
    d.y = raw < 0 ? rubberband(raw, d.height) : raw;
    place(d.y, d.height);
  };
  const onPointerUp = () => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    const panel = panelRef.current, backdrop = backdropRef.current;
    const velocity = releaseVelocity(d.samples, now());
    if (shouldDismiss({ offset: d.y, velocity, height: d.height })) {
      const ms = exitDuration({ remaining: d.height - d.y, velocity });
      swiped.current = true;
      panel.style.transition = `transform ${ms}ms ${THROW}`;
      panel.style.transform = `translateY(${d.height}px)`;
      if (backdrop) { backdrop.style.transition = `opacity ${ms}ms linear`; backdrop.style.opacity = "0"; }
      setTimeout(onClose, ms);
      return;
    }
    // Not far enough, or heading back up: a spring with a little bounce, since
    // the finger carried momentum.
    panel.style.transition = "transform var(--spring-flick-time) var(--spring-flick)";
    panel.style.transform = "translateY(0)";
    if (backdrop) { backdrop.style.transition = "opacity 200ms ease-out"; backdrop.style.opacity = "1"; }
  };

  return createPortal(
    <div className={cx(styles.backdrop, leaving && styles.leaving)} ref={backdropRef} onClick={onClose} data-testid="sheet-backdrop" data-fade="">
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} ref={panelRef} tabIndex={-1} data-fade="" inert={leaving ? "" : undefined}
        className={cx(styles.panel, styles[size], leaving && styles.leaving)} onClick={(e) => e.stopPropagation()} onKeyDown={onKeyDown}>
        <div className={styles.grip} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <span className={styles.handle} aria-hidden="true" />
        </div>
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>{title}</h2>
          <IconButton label="Close" onClick={onClose}><CloseIcon /></IconButton>
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
