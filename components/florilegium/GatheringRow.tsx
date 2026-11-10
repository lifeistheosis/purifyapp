"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Book } from "@/components/ui/icons/Book";
import { Check } from "@/components/ui/icons/Check";
import { Flower } from "@/components/ui/icons/Flower";
import { Quill } from "@/components/ui/icons/Quill";
import type { Florilegium } from "@/lib/florilegium/florilegium";

import { FLOR_FACT, FLOR_PLATE } from "./florStyle";

/**
 * What a row says of one of the reader's gatherings, wherever they are
 * listed (1.9, build 89 notes 6 and 12): on the Florilegium's first page,
 * where a row is a place to go (FlorilegiaHub.tsx), and on the sheet that
 * picks the gathering a line is gathered into, where it is a choice
 * (FlorilegiumPickerSheet.tsx). One drawing, so the two read as one.
 *
 * The mark of where its newest line is from (the Scriptures or a Father; the
 * flower while it keeps nothing), its name, that line, so a reader tells
 * their gatherings apart by what is in them (the owner's request of
 * 2026-09-28), and how many lines it keeps.
 *
 * `gathered`: the line in hand has just gone into this one. Its mark is the
 * check, for the moment the sheet stays to show it.
 */
export function GatheringRowBody({ f, gathered = false }: { f: Florilegium; gathered?: boolean }) {
  const { tn } = useTranslate();
  const newest = f.items[0];
  const Mark = gathered ? Check : !newest ? Flower : newest.kind === "scripture" ? Book : Quill;
  return (
    <>
      <span aria-hidden className={FLOR_PLATE}>
        <Mark size={18} />
      </span>
      <span className="min-w-0 flex-1">
        {/* The reader's words and the line's, each read its own way, so a line of English in a page that reads from the right is cut at its end, not its beginning. */}
        <span dir="auto" className="block truncate font-serif text-[15.5px] font-semibold leading-tight text-paper/92">
          {f.title}
        </span>
        {newest ? (
          <span dir="auto" className="mt-0.5 block truncate font-serif text-caption italic text-paper/60">
            {newest.text}
          </span>
        ) : null}
      </span>
      <span className={FLOR_FACT}>{tn("study.florilegium.lineCount", f.items.length)}</span>
    </>
  );
}
