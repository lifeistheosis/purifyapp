"use client";

import { useEffect, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Sheet } from "@/components/ui/Sheet";
import { Book } from "@/components/ui/icons/Book";
import { Plus } from "@/components/ui/icons/Plus";
import { Quill } from "@/components/ui/icons/Quill";
import { cn } from "@/lib/cn";
import { itemSource } from "@/lib/florilegium/asText";
import {
  useFlorilegia,
  type FlorilegiumItemInput,
} from "@/lib/florilegium/florilegium";

import { FLOR_FIELD, FLOR_PLATE, FLOR_QUIET, FLOR_ROW, FLOR_TRAY } from "./florStyle";
import { GatheringRowBody } from "./GatheringRow";

/** How long the sheet stays to show where the line went, before it closes itself. */
const SHOWN_MS = 750;

/**
 * The sheet that picks the gathering a line goes into (1.9, drawn with the
 * Florilegium's redesign, build 89 notes 6 and 12, so the whole of it reads
 * as one). The one way to gather, wherever a line is gathered from: a verse's
 * tools in the Bible (components/bible/VerseRow.tsx), and the Gather button
 * under a Father's passage (AddToFlorilegium.tsx), which opened a small menu
 * of its own until now, one that ran off the edge of a phone's screen.
 *
 * It is the shared Sheet (components/ui/Sheet.tsx), so it follows the finger
 * and its backdrop dims in step, like every pop-up card; above md it floats
 * as a capped card. It has a field, so it stands on the keyboard while one
 * is up (`keyboard`).
 *
 *   the line      what is being gathered, as it will stand in its
 *                 gathering: the words on their own type, and where they are
 *                 from under them.
 *   the choice    the reader's gatherings, the rows the Florilegium's first
 *                 page lists them in (GatheringRow.tsx). A tap gathers the
 *                 line into that one.
 *   a new one     the tray's last row, which opens the naming field in
 *                 place, as it does on the first page.
 *
 * Once a line is gathered the sheet stays a moment to show it: the row it
 * went into wears the check, and counts one more line. Then it closes
 * itself. Nothing else told a reader in the Bible that anything had
 * happened.
 */
export function FlorilegiumPickerSheet({
  open,
  item,
  onClose,
  onGathered,
}: {
  open: boolean;
  /** The line to gather. Null is allowed so callers can keep the sheet
   * mounted and set the item at open time. */
  item: FlorilegiumItemInput | null;
  onClose: () => void;
  /** The line has gone into the gathering of this name. */
  onGathered?: (name: string) => void;
}) {
  const { t } = useTranslate();
  const { florilegia, create, addItem } = useFlorilegia();
  const [naming, setNaming] = useState(false);
  const [title, setTitle] = useState("");
  // The gathering the line has just gone into, while the sheet shows it.
  const [into, setInto] = useState<string | null>(null);
  const closing = useRef<number | null>(null);

  // Every opening starts at the list, not at a name left half typed.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setNaming(false);
      setTitle("");
      setInto(null);
    }
  }

  useEffect(
    () => () => {
      if (closing.current !== null) window.clearTimeout(closing.current);
    },
    [],
  );

  /** Gathered: say so to the caller, show it, and close after a moment. */
  function gathered(id: string, name: string) {
    onGathered?.(name);
    setNaming(false);
    setInto(id);
    if (closing.current !== null) window.clearTimeout(closing.current);
    closing.current = window.setTimeout(() => {
      closing.current = null;
      onClose();
    }, SHOWN_MS);
  }

  function gatherInto(florilegiumId: string, name: string) {
    // One line goes into one gathering: a second tap while the sheet shows the first does nothing.
    if (into !== null) return;
    if (item) addItem(florilegiumId, item);
    gathered(florilegiumId, name);
  }

  function createAndGather(e: React.FormEvent) {
    e.preventDefault();
    if (into !== null) return;
    // An unnamed gathering is named in the reader's language, as the first
    // page names one: the store keeps the title it is given, and its own
    // fallback is English.
    const name = title.trim() || t("study.florilegium.untitled");
    const id = create(name);
    if (item) addItem(id, item);
    setTitle("");
    gathered(id, name);
  }

  const Mark = item?.kind === "scripture" ? Book : Quill;

  return (
    <Sheet open={open} onClose={onClose} title={t("study.florilegium.gatherInto")} desktop keyboard bodyClassName="px-5 pb-6 pt-1">
      {item ? (
        <figure className="mb-4" data-gather-line="">
          <blockquote dir="auto" className="line-clamp-3 font-serif text-[15px] leading-[1.6] text-paper/90">
            {item.text}
          </blockquote>
          <figcaption className="mt-1.5 flex items-center gap-2 font-sans text-caption font-semibold text-paper/65">
            <Mark size={15} aria-hidden className="shrink-0 text-paper/55" />
            <span dir="auto" className="min-w-0 truncate">
              {itemSource(item)}
            </span>
          </figcaption>
        </figure>
      ) : null}

      {/* Said aloud when the line has gone in: the row's count is the only other sign. */}
      <p className="sr-only" aria-live="polite">
        {into !== null ? t("study.florilegium.gatheredInto", { name: florilegia.find((f) => f.id === into)?.title ?? "" }) : ""}
      </p>

      <ul className={FLOR_TRAY} data-gather-into="">
        {florilegia.length === 0 ? <li className="px-2.5 pb-1.5 pt-3 font-sans text-detail leading-[1.5] text-paper/60">{t("study.florilegium.youHaveNone")}</li> : null}
        {florilegia.map((f) => (
          <li key={f.id} className="theology-rule">
            <button type="button" onClick={() => gatherInto(f.id, f.title)} data-gather-row={f.id} data-gathered={into === f.id ? "" : undefined} className={FLOR_ROW}>
              <GatheringRowBody f={f} gathered={into === f.id} />
            </button>
          </li>
        ))}
        <li className="theology-rule">
          {naming ? (
            <form onSubmit={createAndGather} className="px-2 pb-2.5 pt-3.5" data-florilegium-naming="">
              <label htmlFor="picker-new-name" className="block font-sans text-caption font-semibold text-paper/60">
                {t("study.florilegium.nameNewGathering")}
              </label>
              <input dir="auto"
                id="picker-new-name"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("study.florilegium.namePlaceholder")}
                maxLength={80}
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                className={cn(FLOR_FIELD, "mt-2 min-h-12 py-2.5 font-sans text-ui")}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="tap-press inline-flex h-11 items-center rounded-pill bg-paper px-5 font-sans text-ui font-semibold text-night transition-colors hover:bg-paper/90"
                >
                  {t("study.gather")}
                </button>
                <button type="button" onClick={() => setNaming(false)} className={cn(FLOR_QUIET, "px-3.5 text-ui font-medium text-paper/70")}>
                  {t("nav.back")}
                </button>
              </div>
            </form>
          ) : (
            <button type="button" onClick={() => setNaming(true)} data-florilegium-begin="" className={FLOR_ROW}>
              <span aria-hidden className={FLOR_PLATE}>
                <Plus size={18} />
              </span>
              <span className="min-w-0 flex-1 font-sans text-ui font-semibold leading-snug text-paper">{t("study.florilegium.beginNew")}</span>
            </button>
          )}
        </li>
      </ul>
    </Sheet>
  );
}
