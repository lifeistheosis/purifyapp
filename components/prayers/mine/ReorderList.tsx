"use client";

import { useRef, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Grip } from "@/components/ui/icons/Grip";
import { Orans } from "@/components/ui/icons/Orans";
import { textDir } from "@/lib/i18n/textDir";

export type ReorderRow = {
  key: string;
  title: string;
  meta?: string;
  lang?: string;
  /** "Those I pray for": its node lit, with the praying figure in place of its number. */
  lit?: boolean;
};

type Drag = {
  from: number;
  to: number;
  startY: number;
  pointerId: number;
  rows: HTMLElement[];
  tops: number[];
  heights: number[];
};

/**
 * The prayers of a reader's rule, in their order, to be put in another (1.7).
 *
 * Each row is held by its handle and dragged: the row follows the finger and
 * the rows it passes step aside, by transform alone, with no blur and no
 * layout work while it moves (the Android WebView drops frames on either),
 * and the new order is kept when the finger lifts. No package does this: it
 * is pointer events and a few numbers measured once when the drag begins.
 *
 * The handle also moves its row with the arrow keys, and every row opens a
 * sheet with Move up and Move down, so the order can be changed without a
 * drag at all.
 *
 * 1.8 (the owner's pick A of r3-27): the prayers are numbered steps on one
 * thread, each node on it carrying its place in the rule, "Those I pray for"
 * lit with the praying figure, and the handle at the row's end. `foot` is
 * the thread's last stop, Add prayers. The thread and the nodes are
 * globals.css, "Your rule: the icon above, the steps below".
 */
export function ReorderList({
  rows,
  onMove,
  onOpen,
  foot,
}: {
  rows: ReorderRow[];
  onMove: (from: number, to: number) => void;
  onOpen: (index: number) => void;
  /** The thread's last stop, after the steps. */
  foot?: ReactNode;
}) {
  const { t } = useTranslate();
  const list = useRef<HTMLOListElement>(null);
  const drag = useRef<Drag | null>(null);

  function begin(e: PointerEvent<HTMLButtonElement>, index: number) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const el = list.current;
    if (!el) return;
    const items = Array.from(el.children) as HTMLElement[];
    const rects = items.map((r) => r.getBoundingClientRect());
    drag.current = {
      from: index,
      to: index,
      startY: e.clientY,
      pointerId: e.pointerId,
      rows: items,
      tops: rects.map((r) => r.top),
      heights: rects.map((r) => r.height),
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    items[index].dataset.dragging = "";
    e.preventDefault();
  }

  function move(e: PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointerId) return;
    const dy = e.clientY - d.startY;
    d.rows[d.from].style.transform = `translateY(${dy}px)`;
    const centre = d.tops[d.from] + d.heights[d.from] / 2 + dy;
    let to = d.from;
    for (let i = 0; i < d.from; i++) {
      if (centre < d.tops[i] + d.heights[i] / 2) {
        to = i;
        break;
      }
    }
    if (to === d.from) {
      for (let i = d.rows.length - 1; i > d.from; i--) {
        if (centre > d.tops[i] + d.heights[i] / 2) {
          to = i;
          break;
        }
      }
    }
    d.to = to;
    const step = d.heights[d.from];
    d.rows.forEach((row, i) => {
      if (i === d.from) return;
      const shift = d.from < to && i > d.from && i <= to ? -step : d.from > to && i >= to && i < d.from ? step : 0;
      row.style.transform = shift ? `translateY(${shift}px)` : "";
    });
  }

  function end(commit: boolean) {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    // Put every row back where layout has it, at once: the new order is
    // drawn in the same frame, so nothing slides back and forth.
    for (const row of d.rows) {
      row.style.transition = "none";
      row.style.transform = "";
      delete row.dataset.dragging;
    }
    requestAnimationFrame(() => {
      for (const row of d.rows) row.style.transition = "";
    });
    if (commit && d.to !== d.from) onMove(d.from, d.to);
  }

  function keys(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (e.key === "ArrowUp" && index > 0) {
      e.preventDefault();
      onMove(index, index - 1);
    } else if (e.key === "ArrowDown" && index < rows.length - 1) {
      e.preventDefault();
      onMove(index, index + 1);
    }
  }

  return (
    <div className="rule-thread">
      <ol ref={list} className="rule-steps">
        {rows.map((row, i) => (
          <li
            key={row.key}
            className="rule-step relative flex items-center gap-3 motion-safe:transition-transform motion-safe:duration-150 data-[dragging]:z-10 data-[dragging]:rounded-[14px] data-[dragging]:bg-night-soft data-[dragging]:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.7)] data-[dragging]:transition-none"
          >
            <span aria-hidden className="rule-node" data-lit={row.lit ? "" : undefined}>
              {row.lit ? <Orans size={15} /> : i + 1}
            </span>
            <button
              type="button"
              data-step-open
              onClick={() => onOpen(i)}
              aria-haspopup="dialog"
              className="tap-press flex min-h-14 min-w-0 flex-1 flex-col items-start justify-center py-2.5 text-start"
            >
              <span data-step-title lang={row.lang} dir={textDir(row.lang)} className="max-w-full truncate font-serif text-[15.5px] font-semibold leading-snug text-paper">
                {row.title}
              </span>
              {row.meta ? <span className="mt-0.5 max-w-full truncate font-sans text-caption text-paper/55">{row.meta}</span> : null}
            </button>
            <button
              type="button"
              aria-label={t("prayers.mine.moveRow", { title: row.title })}
              onPointerDown={(e) => begin(e, i)}
              onPointerMove={move}
              onPointerUp={() => end(true)}
              onPointerCancel={() => end(false)}
              onKeyDown={(e) => keys(e, i)}
              className="-me-2 inline-flex min-h-12 min-w-11 shrink-0 cursor-grab touch-none items-center justify-center text-paper/40 hover:text-paper active:cursor-grabbing"
            >
              <Grip size={20} />
            </button>
          </li>
        ))}
      </ol>
      {foot}
    </div>
  );
}
