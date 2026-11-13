"use client";

import { useId, type RefObject } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Sheet } from "@/components/ui/Sheet";
import { ChevronDown } from "@/components/ui/icons/ChevronDown";

/**
 * Discover's doors moved without a drag (1.9, build 95 note 9; WCAG 2.5.7).
 *
 * The doors are held and moved on Discover itself (./DoorOrder.tsx). Not
 * every hand can hold and draw, and a keyboard or a screen reader cannot, so
 * the same order is here as a list: each door with Move up and Move down (the
 * words Your rule already uses, components/prayers/mine/ItemSheet.tsx), each
 * move felt as one click and said aloud by ./DoorOrder.tsx, and at the foot,
 * once the order is the reader's own, the way back to the original one. A
 * movable sheet, as every pop-up in the app is.
 *
 * Each row is a group named by its door, so a screen reader says which door
 * a button moves; the buttons carry the house's words, and the arrows are
 * the house's chevron. A button that would move a door past an end is off,
 * as Your rule's are.
 */
export function ArrangeSheet({
  open,
  onClose,
  listRef,
  rows,
  atFirst,
  onMove,
  onRestore,
}: {
  open: boolean;
  onClose: () => void;
  listRef: RefObject<HTMLOListElement | null>;
  rows: { id: string; name: string }[];
  /** The doors stand in the original order: there is nothing to restore. */
  atFirst: boolean;
  onMove: (from: number, by: -1 | 1) => void;
  onRestore: () => void;
}) {
  const { t } = useTranslate();
  const base = useId();
  const arrow =
    "tap-press inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-paper/80 hover:text-paper disabled:opacity-35";

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t("discover.arrange")}
      desktop
      // Its own height: the way back to the original order is its last line,
      // which a 60% opening would leave below the screen.
      openFull
      lead={<p className="font-sans text-caption leading-[1.45] text-paper/70">{t("discover.arrangeHint")}</p>}
      foot={
        atFirst ? undefined : (
          <div className="px-4 pt-2 pb-4">
            <button
              type="button"
              data-arrange-restore=""
              onClick={() => {
                onRestore();
                // The button goes with the order it restored: the first door's move keeps the keyboard in the list.
                listRef.current?.querySelector<HTMLButtonElement>("button:not([disabled])")?.focus({ preventScroll: true });
              }}
              className="tap-press inline-flex min-h-11 w-full items-center justify-center rounded-pill px-4 font-sans text-detail font-semibold text-paper/80 ring-1 ring-inset ring-paper/15 hover:text-paper"
            >
              {t("discover.restore")}
            </button>
          </div>
        )
      }
    >
      <ol ref={listRef} className="flex flex-col">
        {rows.map((row, i) => {
          const name = `${base}-${i}`;
          return (
            <li
              key={row.id}
              data-arrange-row={row.id}
              role="group"
              aria-labelledby={name}
              className="flex min-h-14 items-center gap-1 border-b border-paper/10 last:border-b-0"
            >
              <span id={name} className="min-w-0 flex-1 truncate font-sans text-ui font-medium text-paper">
                {row.name}
              </span>
              <button
                type="button"
                data-move="up"
                disabled={i === 0}
                aria-label={t("prayers.mine.moveUp")}
                onClick={() => onMove(i, -1)}
                className={arrow}
              >
                <ChevronDown size={20} className="rotate-180" />
              </button>
              <button
                type="button"
                data-move="down"
                disabled={i === rows.length - 1}
                aria-label={t("prayers.mine.moveDown")}
                onClick={() => onMove(i, 1)}
                className={arrow}
              >
                <ChevronDown size={20} />
              </button>
            </li>
          );
        })}
      </ol>
    </Sheet>
  );
}
