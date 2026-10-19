"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Sheet } from "@/components/ui/Sheet";
import { ChevronDown } from "@/components/ui/icons/ChevronDown";

/**
 * One prayer of a reader's rule, opened (1.7): its words, so the reader can
 * see what it is before keeping it, and the three things to do with it:
 * move it up, move it down, take it out. A movable sheet, as every pop-up in
 * the app is.
 */
export function ItemSheet({
  open,
  onClose,
  title,
  from,
  words,
  lang,
  canUp,
  canDown,
  onUp,
  onDown,
  onRemove,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  from?: string;
  words?: string;
  lang?: string;
  canUp: boolean;
  canDown: boolean;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}) {
  const { t } = useTranslate();
  const action =
    "tap-press inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-pill px-3 font-sans text-detail font-semibold ring-1 ring-inset ring-paper/15 text-paper/85 hover:text-paper disabled:opacity-35";

  return (
    <Sheet open={open} onClose={onClose} title={title} desktop>
      {from ? <p className="font-sans text-caption text-paper/55">{from}</p> : null}
      {words ? (
        <p lang={lang} className="mt-3 line-clamp-[12] whitespace-pre-line font-serif text-body leading-[1.7] text-paper/85">
          {words}
        </p>
      ) : null}
      <div className="mt-5 flex gap-2">
        <button type="button" disabled={!canUp} onClick={onUp} className={action}>
          <ChevronDown size={15} className="shrink-0 rotate-180" />
          {t("prayers.mine.moveUp")}
        </button>
        <button type="button" disabled={!canDown} onClick={onDown} className={action}>
          <ChevronDown size={15} className="shrink-0" />
          {t("prayers.mine.moveDown")}
        </button>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="tap-press mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-pill font-sans text-detail font-semibold text-paper/70 hover:text-paper"
      >
        {t("prayers.mine.remove")}
      </button>
    </Sheet>
  );
}
