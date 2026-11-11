"use client";

import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { textDir } from "@/lib/i18n/textDir";
import { CoverArt } from "@/components/player/CoverArt";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Book } from "@/components/ui/icons/Book";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { Quill } from "@/components/ui/icons/Quill";
import { Scroll } from "@/components/ui/icons/Scroll";
import { Share } from "@/components/ui/icons/Share";
import { cn } from "@/lib/cn";
import { florilegiumAsText, itemSource } from "@/lib/florilegium/asText";
import {
  useFlorilegia,
  type FlorilegiumItem,
} from "@/lib/florilegium/florilegium";
import { hideGathering, showGathering } from "@/lib/florilegium/gatheringNow";
import { writeInGathering } from "@/lib/journal/gatheringActions";
import { lineBlock } from "@/lib/journal/gatherings";
import { lineHref } from "@/lib/florilegium/href";
import { starterOf, starterPicture } from "@/lib/florilegium/starters";
import { useIsNative } from "@/lib/platform/native";
import { shareText } from "@/lib/share/shareImage";
import { printPart } from "@/lib/ui/printPart";
import { useMounted } from "@/lib/useMounted";

import { FLOR_FIELD, FLOR_H1, FLOR_KICKER, FLOR_PLATE, FLOR_QUIET, FLOR_ROW, FLOR_TITLE, FLOR_TRAY } from "./florStyle";
import { GatheringPages } from "./GatheringPages";
import { gatheringCarry } from "./GatheringRow";

// On the server there is no layout to read and useLayoutEffect only warns
// (the same choice components/nav/RouteTransition.tsx makes).
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * One gathering: its name, and its lines set to read (1.9, build 89 note 12,
 * the owner of the Florilegium: "entire design revamped. I just don't like
 * that"). Local-first via useFlorilegia.
 *
 * It was a small label over a giant title over an outlined count, a second
 * way back under the bar's own, and every line a boxed card with an icon
 * tile. Now it is a page of a commonplace book: the name in Lora with what
 * it is and how many lines it keeps under it, then each line on its own
 * type (ItemCard), a hairline between two, and at the foot the one thing to
 * do with the whole of it.
 *
 * Handed on (1.9, s5-05: "share a florilegium as a page or a booklet,
 * citations kept exact"): on the website, Print or save as PDF prints the
 * gathering alone as a booklet (lib/ui/printPart.ts); in the apps, Share
 * hands its words to the phone's share sheet, each line as it was kept with
 * its source (lib/florilegium/asText.ts).
 *
 * `readOnly`: a reader whose Plus has lapsed (rec 10): the gathering's lines
 * and notes to read, with no note added, no line removed, nothing handed on
 * and no Delete; the Plus card stands under it (FlorilegiumGate).
 */
export function FlorilegiumDetail({ id, readOnly = false }: { id: string; readOnly?: boolean }) {
  const { t, tn } = useTranslate();
  const native = useIsNative();
  const router = useRouter();
  const { florilegia, remove, removeItem, setItemNote } = useFlorilegia();
  const f = useMemo(
    () => florilegia.find((x) => x.id === id),
    [florilegia, id],
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const mounted = useMounted();
  // Kept from a starter: it wears the starter's picture (lib/florilegium/starters.ts).
  const starter = f ? starterOf(f) : undefined;
  const picture = starter ? starterPicture(starter) : null;

  // The bar over the page takes this gathering's name, and only the
  // gathering knows which it is (lib/florilegium/gatheringNow.ts). A layout
  // effect, so on a plain arrival the name is with the bar before the page
  // is painted. In a transition React keeps it until the transition is
  // over, and the bar is made so that nothing is seen of the wait
  // (components/florilegium/GatheringBar.tsx).
  const openId = f?.id;
  const openTitle = f?.title;
  useIsoLayoutEffect(() => {
    if (openId === undefined || openTitle === undefined) return;
    showGathering(openId, openTitle);
    return () => hideGathering(openId);
  }, [openId, openTitle]);

  // The gatherings are the device's own, so a server, and the first draw
  // that must agree with it, know none: nothing is said until the device has
  // been read. After that an unknown id is a genuine miss (deleted on
  // another device, or a stale link): said gently, with the way back, never
  // a hard 404 inside a client component.
  if (!f) {
    if (!mounted) return null;
    return (
      <div className="pt-6 text-center" data-gathering-gone="">
        {/* The page's heading, for a screen reader. A gathering's page is headed by the gathering's own name;
            this one has none, and the name in the bar over it is for the eye alone (aria-hidden,
            components/nav/MobileTopBar.tsx). Unseen, so the page looks as it did. */}
        <h1 className="sr-only">{t("study.florilegium.title")}</h1>
        <p className="font-serif text-lede italic leading-[1.5] text-paper/70">{t("study.florilegium.gone")}</p>
        <Link
          href="/florilegium"
          className="tap-press mt-6 inline-flex h-12 items-center rounded-pill border border-paper/20 bg-paper/[0.05] px-6 font-sans text-ui font-semibold text-paper transition-colors hover:bg-paper/10"
        >
          {t("study.florilegium.backToYours")}
        </Link>
      </div>
    );
  }

  return (
    <div data-gathering-page={f.id}>
      {/* On a computer, the way back to the gatherings; a phone has the bar's. */}
      <p className="mb-6 hidden md:block native-md-hidden">
        <Link href="/florilegium" className="inline-flex items-center font-sans text-detail font-semibold text-paper/55 transition-colors hover:text-paper">
          <ChevronLeft size={16} className="me-1.5 shrink-0 rtl:-scale-x-100" />
          {t("study.florilegium.backToYours")}
        </Link>
      </p>

      {/* What the booklet prints: the name, its line, and the lines (1.9). */}
      <div data-print-part="">
        <header className={picture ? "flex items-center gap-4" : undefined}>
          {/* Kept from a starter: its picture, which the row carried in (GatheringRow.tsx). Not in the booklet, which is the reader's words. */}
          {picture ? (
            <span
              aria-hidden
              data-gathering-picture=""
              data-carry-into={gatheringCarry(f.id)}
              className="relative block aspect-[4/5] w-[72px] shrink-0 overflow-hidden rounded-[12px] bg-night-soft shadow-[0_18px_40px_-20px_rgba(0,0,0,0.75)] print:hidden"
            >
              <CoverArt src={picture.src} fallback={picture.fallback} size={144} className="absolute inset-0 h-full w-full" />
              <span className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-paper/10" />
            </span>
          ) : null}
          <div className="min-w-0">
            {/* The reader's own words, and lines in whatever language they were gathered in: each reads its own way (dir="auto"), as a kept verse does on You. */}
            <h1 id={FLOR_TITLE} dir="auto" className={cn(FLOR_H1, "text-balance")}>
              {f.title}
            </h1>
            <p className={FLOR_KICKER}>
              {f.description ? `${f.description} · ` : null}
              <span className="tabular-nums">{tn("study.florilegium.lineCount", f.items.length)}</span>
            </p>
          </div>
        </header>

        {f.items.length === 0 ? (
          <p className="mt-7 max-w-[52ch] font-serif text-body italic leading-[1.6] text-paper/70">{t("study.nothingGatheredYetAsYou")}</p>
        ) : (
          <ul className="mt-4" data-gathering-lines="">
            {f.items.map((item) => (
              <li key={item.id} className="border-t border-paper/8 first:border-t-0">
                <ItemCard
                  item={item}
                  readOnly={readOnly}
                  onRemove={() => removeItem(f.id, item.id)}
                  onNote={(note) => setItemNote(f.id, item.id, note)}
                  onWrite={() => {
                    // A page in this gathering, with this line as its card (lib/journal/gatherings.ts).
                    if (writeInGathering(f.title, lineBlock(item))) router.push("/journal/");
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* The journal's pages written in this gathering, and the way to write one (build 93 note 19; GatheringPages.tsx). */}
      <GatheringPages title={f.title} readOnly={readOnly} />

      {readOnly ? null : (
        <div className="mt-8" data-gathering-tools="">
          {f.items.length > 0 ? (
            <div className={FLOR_TRAY}>
              {native ? (
                <button type="button" onClick={() => void shareText(f.title, florilegiumAsText(f))} className={FLOR_ROW}>
                  <span aria-hidden className={FLOR_PLATE}>
                    <Share size={18} />
                  </span>
                  <span className="min-w-0 flex-1 font-sans text-ui font-semibold leading-snug text-paper">{t("common.share")}</span>
                </button>
              ) : (
                <button type="button" onClick={printPart} className={FLOR_ROW}>
                  <span aria-hidden className={FLOR_PLATE}>
                    <Scroll size={18} />
                  </span>
                  <span className="min-w-0 flex-1 font-sans text-ui font-semibold leading-snug text-paper">{t("journal.print")}</span>
                </button>
              )}
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="tap-press mt-3 inline-flex min-h-11 items-center rounded-pill px-3.5 font-sans text-detail font-semibold text-paper/60 transition-colors hover:bg-crimson/15 hover:text-crimson-soft"
          >
            {t("study.florilegium.deleteThis")}
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmingDelete}
        title={t("study.florilegium.deleteConfirm")}
        description={t("study.florilegium.deleteDescription")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("study.florilegium.keepIt")}
        destructive
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => {
          setConfirmingDelete(false);
          remove(f.id);
          if (typeof window !== "undefined") {
            window.location.assign("/florilegium");
          }
        }}
      />
    </div>
  );
}

/**
 * One gathered line as its gathering shows it: the words on their own type,
 * in the size the app reads at, never in a box and never beside a rule
 * (CLAUDE.md, "No side stripes"); under them where they are from, with the
 * mark of the Scriptures or of a Father, which opens the place; then the
 * reader's own note. Also what the Plus page's preview of the Florilegium
 * draws (components/billing/plusTry/TryFlorilegium.tsx).
 */
export function ItemCard({
  item,
  onRemove,
  onNote,
  onWrite,
  readOnly = false,
  textLang,
}: {
  item: FlorilegiumItem;
  onRemove: () => void;
  onNote: (note: string) => void;
  /** Begin a journal page in this gathering with this line as its card (build 93 note 19). Left out where there is no gathering to write in: the Plus page's preview. */
  onWrite?: () => void;
  /** To read only: no note added or changed, nothing removed, no page begun (rec 10). */
  readOnly?: boolean;
  /**
   * The language the gathered words are known to be in: the Plus screen's
   * preview, whose lines are the app's English. A gathering's own lines record
   * no language, so they read as they are written (dir="auto"), as a kept verse
   * does on You (build 90 note 4). A Father's source is the same English; a
   * verse's reference is in the reader's language.
   */
  textLang?: string;
}) {
  const { t } = useTranslate();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.note ?? "");

  const source = itemSource(item);
  // A verse opens at the verse, not at its chapter's first line (build 93 note 19; lib/florilegium/href.ts).
  const href = lineHref(item);
  const mark = item.kind === "scripture" ? <Book size={15} aria-hidden className="shrink-0 text-paper/55" /> : <Quill size={15} aria-hidden className="shrink-0 text-paper/55" />;
  const SOURCE = "inline-flex min-h-11 min-w-0 items-center gap-2 font-sans text-caption font-semibold text-paper/65";
  const said = textLang ? { lang: textLang, dir: textDir(textLang) } : { dir: "auto" as const };
  const sourceSaid = item.kind === "father" ? said : { dir: "auto" as const };

  return (
    <article data-gathered-line={item.kind} className="pb-2 pt-5">
      <blockquote {...said} className="font-serif text-[17px] leading-[1.7] text-paper/90">
        {item.text}
      </blockquote>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-2">
        {href ? (
          <Link href={href} className={cn(SOURCE, "transition-colors hover:text-paper")}>
            {mark}
            <span {...sourceSaid} className="min-w-0">{source}</span>
          </Link>
        ) : (
          <p className={SOURCE}>
            {mark}
            <span {...sourceSaid} className="min-w-0">{source}</span>
          </p>
        )}
        {!editing && !readOnly && (
          // The line's things to do, at the row's end. With three of them a narrow
          // phone or a long language has no room on one line: they go under the
          // source, and wrap among themselves before any name is cut.
          <span className="ms-auto flex max-w-full flex-wrap items-center justify-end" data-gathered-tools="" data-print-hide="">
            <button type="button" onClick={() => setEditing(true)} className={FLOR_QUIET}>
              {item.note ? t("bible.editNote") : t("bible.addNote")}
            </button>
            {/* After the note's button, which the Florilegium's own mock finds as the line's first. */}
            {onWrite ? (
              <button type="button" onClick={onWrite} data-gathered-write="" className={FLOR_QUIET}>
                {t("study.florilegium.writePage")}
              </button>
            ) : null}
            <button type="button" onClick={onRemove} className={FLOR_QUIET}>
              {t("prayers.diptychs.remove")}
            </button>
          </span>
        )}
      </div>

      {editing ? (
        <div className="mb-3 mt-2" data-print-hide="">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            dir="auto"
            aria-label={t("bible.yourNote")}
            placeholder={t("study.florilegium.notePlaceholder")}
            className={cn(FLOR_FIELD, "py-3 font-serif text-detail leading-[1.6]")}
          />
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onNote(draft);
                setEditing(false);
              }}
              className="tap-press inline-flex h-11 items-center rounded-pill bg-paper px-5 font-sans text-detail font-semibold text-night transition-colors hover:bg-paper/90"
            >
              {t("study.florilegium.saveNote")}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(item.note ?? "");
                setEditing(false);
              }}
              className={FLOR_QUIET}
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      ) : item.note ? (
        <div className="mb-3 mt-1.5 rounded-[14px] bg-paper/[0.05] px-3.5 py-3" data-gathered-note="">
          <p className="font-sans text-caption font-semibold text-paper/60">{t("bible.yourNote")}</p>
          <p dir="auto" className="mt-1 font-serif text-detail leading-[1.6] text-paper/85">
            {item.note}
          </p>
        </div>
      ) : null}
    </article>
  );
}
