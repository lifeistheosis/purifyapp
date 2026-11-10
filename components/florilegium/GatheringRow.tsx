"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { CoverArt } from "@/components/player/CoverArt";
import { Book } from "@/components/ui/icons/Book";
import { Check } from "@/components/ui/icons/Check";
import { Flower } from "@/components/ui/icons/Flower";
import { Quill } from "@/components/ui/icons/Quill";
import type { Florilegium } from "@/lib/florilegium/florilegium";
import { starterOf, starterPicture } from "@/lib/florilegium/starters";

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
 * A gathering kept from a starter wears the starter's picture in the mark's
 * place (lib/florilegium/starters.ts, starterOf), and where the row is a
 * place to go the picture travels to the head of its page (`carry`, the
 * gathering's own key: the starter's tile on the same page carries the same
 * picture under the picture's address).
 *
 * `gathered`: the line in hand has just gone into this one. Its mark is the
 * check, for the moment the sheet stays to show it.
 */

/** The key a gathering's picture travels under, from its row to its page's head (lib/ui/routeMotion.ts). */
export const gatheringCarry = (id: string) => `gathering:${id}`;

export function GatheringRowBody({ f, gathered = false, carry = false }: { f: Florilegium; gathered?: boolean; /** The row opens the gathering's page. */ carry?: boolean }) {
  const { tn } = useTranslate();
  const newest = f.items[0];
  const Mark = gathered ? Check : !newest ? Flower : newest.kind === "scripture" ? Book : Quill;
  // The check says the line went in; it takes the picture's place for its moment.
  const starter = gathered ? undefined : starterOf(f);
  const picture = starter ? starterPicture(starter) : null;
  return (
    <>
      {picture ? (
        <span aria-hidden data-gathering-picture="" data-carry={carry ? gatheringCarry(f.id) : undefined} className="relative block size-9 shrink-0 overflow-hidden rounded-[11px] bg-night-soft">
          <CoverArt src={picture.src} fallback={picture.fallback} size={72} className="absolute inset-0 h-full w-full" />
          <span className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-paper/10" />
        </span>
      ) : (
        <span aria-hidden className={FLOR_PLATE}>
          <Mark size={18} />
        </span>
      )}
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
