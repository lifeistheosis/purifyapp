"use client";

// A list row that a finger can push away (1.7, the owner's note 21: "swipe to
// remove (with undo)"). First used by Saved and the journal; any list of the
// reader's own things can take it (the Florilegium, Chat's lists).
//
// The row follows the finger toward the start of the line (left, or right in
// Arabic and Urdu), and behind it the word Remove shows on a faint paper
// ground: no red, no icon. Past 40 percent of the row, or with a quick flick,
// it goes: the row folds its height away and onRemove runs; the screen offers
// Undo (components/ui/UndoBar.tsx). Short of that it springs back.
//
//  - Every move is written to the DOM through refs, the useDraggableSheet way:
//    a drag re-renders nothing.
//  - touch-action: pan-y. The page still scrolls under a vertical finger; a
//    gesture is only the row's once it is plainly sideways.
//  - A swipe that starts within 24px of either edge of the screen is left to
//    the system: the iPhone's back swipe and Android's back gesture.
//  - Never swipe-only: a Remove button at the row's end, shown on hover with
//    a pointer and whenever it has the keyboard's focus.
//  - Motion off (data-motion="reduce"): no slide back and no fold; a removed
//    row dissolves.

import { useCallback, useEffect, useRef } from "react";

import { cn } from "@/lib/cn";
import { softTick } from "@/lib/ui/softTick";

/** Share of the row's width past which a release removes it. */
const COMMIT_SHARE = 0.4;
/** A release this fast (px per ms) toward removal removes it too. */
const FLICK = 0.55;
/** Movement before a gesture is read as sideways or not. */
const SLOP = 8;
/** The edges of the screen belong to the system's back gestures. */
const EDGE = 24;

const reducedMotion = () => typeof document !== "undefined" && document.documentElement.dataset.motion === "reduce";
const rtl = () => typeof document !== "undefined" && document.documentElement.dir === "rtl";

export function SwipeRow({
  children,
  onRemove,
  removeLabel,
  className,
  rowClassName,
  disabled = false,
}: {
  children: React.ReactNode;
  /** Called once the row has gone. */
  onRemove: () => void;
  /** The word on the revealed ground and on the button: "Remove". */
  removeLabel: string;
  /** On the <li>. */
  className?: string;
  /** On the part that slides, which carries the row's own padding. */
  rowClassName?: string;
  disabled?: boolean;
}) {
  const liRef = useRef<HTMLLIElement>(null);
  const slideRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<{
    id: number;
    x0: number;
    y0: number;
    sideways: boolean | null;
    offset: number;
    samples: { t: number; x: number }[];
  } | null>(null);
  const moved = useRef(false);
  const gone = useRef(false);
  const onRemoveRef = useRef(onRemove);
  useEffect(() => {
    onRemoveRef.current = onRemove;
  }, [onRemove]);

  /** Where the row is, in px toward removal (0 at rest). */
  const paint = useCallback((offset: number, transition: string | null) => {
    const slide = slideRef.current;
    const reveal = revealRef.current;
    if (!slide) return;
    slide.style.transition = transition ?? "none";
    slide.style.transform = offset === 0 ? "" : `translate3d(${rtl() ? offset : -offset}px, 0, 0)`;
    if (reveal) {
      reveal.style.transition = transition ? `opacity ${transition.split(" ")[1] ?? "200ms"} ease` : "none";
      reveal.style.opacity = offset > 0 ? String(Math.min(1, offset / 56)) : "0";
    }
  }, []);

  /** The row goes: slide out, fold away, then tell the list. */
  const remove = useCallback(() => {
    const li = liRef.current;
    if (!li || gone.current) return;
    gone.current = true;
    softTick();
    const done = () => onRemoveRef.current();
    if (reducedMotion()) {
      li.style.transition = "opacity 160ms ease";
      li.style.opacity = "0";
      window.setTimeout(done, 160);
      return;
    }
    const width = li.offsetWidth;
    paint(width, "transform 180ms cubic-bezier(0.4, 0, 1, 1)");
    window.setTimeout(() => {
      li.style.height = `${li.offsetHeight}px`;
      li.style.overflow = "hidden";
      void li.offsetHeight;
      li.style.transition = "height 200ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease";
      li.style.height = "0px";
      li.style.opacity = "0";
      window.setTimeout(done, 200);
    }, 170);
  }, [paint]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled || gone.current || e.pointerType === "mouse" || !e.isPrimary) return;
    if (e.clientX < EDGE || e.clientX > window.innerWidth - EDGE) return;
    moved.current = false;
    gesture.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, sideways: null, offset: 0, samples: [{ t: e.timeStamp, x: e.clientX }] };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.x0;
    const dy = e.clientY - g.y0;
    if (g.sideways === null) {
      if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return;
      g.sideways = Math.abs(dx) > Math.abs(dy);
      if (!g.sideways) {
        gesture.current = null;
        return;
      }
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {
        /* the gesture still works without capture */
      }
    }
    // Toward the start of the line removes; the other way only resists.
    const toward = rtl() ? dx : -dx;
    g.offset = toward > 0 ? toward : toward / 6;
    if (Math.abs(g.offset) > 4) moved.current = true;
    g.samples.push({ t: e.timeStamp, x: e.clientX });
    if (g.samples.length > 6) g.samples.shift();
    paint(Math.max(-12, g.offset), null);
  };

  const release = (e: React.PointerEvent, cancelled: boolean) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g || g.id !== e.pointerId || !g.sideways) return;
    const li = liRef.current;
    const width = li?.offsetWidth ?? 320;
    const first = g.samples[0];
    const last = g.samples[g.samples.length - 1];
    const dt = Math.max(1, last.t - first.t);
    const velocity = ((rtl() ? 1 : -1) * (last.x - first.x)) / dt;
    if (!cancelled && (g.offset > width * COMMIT_SHARE || (velocity > FLICK && g.offset > 40))) {
      remove();
      return;
    }
    paint(0, reducedMotion() ? null : "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)");
  };

  // A swipe ends on the row's link: that release is not a tap.
  const onClickCapture = (e: React.MouseEvent) => {
    if (!moved.current) return;
    moved.current = false;
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <li ref={liRef} className={cn("group relative overflow-hidden", className)}>
      <div
        ref={revealRef}
        aria-hidden
        className="pointer-events-none absolute inset-y-0 end-0 flex w-full items-center justify-end bg-paper/10 pe-5 font-sans text-detail font-semibold text-paper"
        style={{ opacity: 0 }}
      >
        {removeLabel}
      </div>
      <div
        ref={slideRef}
        className={cn("relative flex items-stretch bg-night [touch-action:pan-y]", rowClassName)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => release(e, false)}
        onPointerCancel={(e) => release(e, true)}
        onClickCapture={onClickCapture}
      >
        <div className="min-w-0 flex-1">{children}</div>
        {/* Out of the way of a finger (it cannot be tapped unseen), there for
            a pointer that hovers and for the keyboard, which can always reach
            it: Enter works whatever pointer-events says. */}
        <button
          type="button"
          onClick={remove}
          disabled={disabled}
          className="pointer-events-none absolute inset-y-0 end-1 my-auto inline-flex h-11 items-center rounded-pill bg-night px-3 font-sans text-caption font-semibold text-paper/65 opacity-0 transition-opacity hover:text-paper focus-visible:opacity-100 md:group-hover:pointer-events-auto md:group-hover:opacity-100"
        >
          {removeLabel}
        </button>
      </div>
    </li>
  );
}
