"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { AddToFlorilegium } from "@/components/florilegium/AddToFlorilegium";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { SaintFace } from "@/components/today/SaintFace";
import { Book } from "@/components/ui/icons/Book";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Share } from "@/components/ui/icons/Share";
import { cn } from "@/lib/cn";
import { streamedUrl } from "@/lib/media/streamed";
import { isNativeClient } from "@/lib/platform/native";
import { FOOT, portraitLook, type Look } from "@/lib/share/verseCard";
import { cardTextSize, medallionInitial, medallionName } from "@/lib/theology/page";
import { SAINT_FACES, coverFile } from "@/lib/today/saintFaces";
import { scrollBehavior } from "@/lib/ui/motion";
import { useMounted } from "@/lib/useMounted";

import { fatherPicture } from "./fatherPicture";

// Loaded on the tap of Share, as the verse card loads it: the page carries no
// canvas for a reader who never shares.
const PictureSheet = dynamic(() => import("@/components/share/PictureSheet").then((m) => m.PictureSheet), { ssr: false });

/** One passage of the study, as its card shows it. Resolved on the server (components/theology/TopicReader.tsx). */
export type DeckPassage = {
  /** The words, verbatim, in English as the study has them. */
  text: string;
  /** Its Father's medallion (lib/theology/page.ts, fatherKey). */
  father: string;
  /** Who: the saint's name as the registry has it, else the source's printed name. */
  name: string;
  /** The name as the source prints it, kept with a gathered line. */
  author: string;
  saintSlug?: string;
  /** The work, and the place in it, as the line under a quotation gives them. */
  work?: string;
  place?: string;
  /** Close to the passage it opens, not as its edition prints it. */
  inexact?: boolean;
  /** Where Read where it's from opens: the words where they stand in the app, else the public-domain page they were read on. */
  source?: { href: string; external: boolean };
  /** The study's own line on why the passage is quoted. */
  gloss?: string;
  /** Where a gathered line opens again. */
  gatherHref?: string;
};

/** One medallion over the deck. */
export type DeckFather = {
  key: string;
  name: string;
  count: number;
  saintSlug?: string;
  /** The icon the app carries, for when his portrait cannot be had. */
  iconUrl?: string;
};

/**
 * The Fathers' door of a doctrine's page (1.8, round 3 r3-04, part 2, the
 * owner's mix of B and C, 2026-10-30).
 *
 * From B, the medallions: the Fathers open on their faces, most quoted first,
 * each with how many of the study's passages are his, and All first with
 * them all. A tap on a face shows his passages alone; a tap again, all.
 *
 * From C, the deck: the passages as picture cards to swipe, each already the
 * picture it shares, as the verse picture is: his face above, never written
 * over, then his words, his name, the work and the place, signed Purify App.
 * Under the card in view, Read where it's from (the words where they stand
 * in the app, or the public-domain page they were read on) and Share, which
 * makes the picture (components/share/PictureSheet.tsx) with his portrait as
 * its first look. Then the study's own line on the passage, and Gather.
 *
 * The deck opens on the study's epigraph (lib/theology/page.ts,
 * epigraphIndex): the editors' pick where the study has one, else its first
 * passage.
 *
 * Pictures: his cover portrait, every one opened and its rights recorded
 * (lib/today/saintFaces.ts), asked of the website in the apps, with the icon
 * the app carries when it cannot be had, as Today's saint shows him. A
 * shared picture carries only the portrait, never an icon whose rights are
 * not recorded. A Father with no picture, and a text no one Father wrote
 * (the Liturgy, a council), has his initial in a ring.
 */
export function FathersDeck({ passages, fathers, opening }: { passages: DeckPassage[]; fathers: DeckFather[]; opening: number }) {
  const { t } = useTranslate();
  // The pictures are chosen on the device: the apps ask the website for a
  // portrait, so the address is known only there (lib/media/streamed.ts).
  const onDevice = useMounted();
  const native = onDevice && isNativeClient();
  const [chosen, setChosen] = useState<string | null>(null);
  const list = useMemo(() => (chosen ? passages.filter((p) => p.father === chosen) : passages), [passages, chosen]);
  const [at, setAt] = useState(() => Math.min(Math.max(opening, 0), Math.max(passages.length - 1, 0)));
  const [sharing, setSharing] = useState(false);
  const deck = useRef<HTMLUListElement>(null);
  const frame = useRef(0);
  const byKey = useMemo(() => new Map(fathers.map((f) => [f.key, f])), [fathers]);

  /** Where the card at `index` starts, as the deck scrolls: one card and its gap apart. */
  const stepOf = useCallback((el: HTMLUListElement) => {
    const first = el.querySelector<HTMLElement>("[data-deck-card]");
    if (!first) return 0;
    const gap = parseFloat(window.getComputedStyle(el).columnGap || "0") || 0;
    return first.offsetWidth + gap;
  }, []);

  const scrollToCard = useCallback(
    (index: number, smooth: boolean) => {
      const el = deck.current;
      if (!el) return;
      const step = stepOf(el);
      const rtl = window.getComputedStyle(el).direction === "rtl";
      el.scrollTo({ left: (rtl ? -1 : 1) * index * step, behavior: smooth ? scrollBehavior() : "auto" });
    },
    [stepOf],
  );

  // The deck opens on its epigraph.
  useEffect(() => {
    if (at > 0) scrollToCard(at, false);
    // Once, as the page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => window.cancelAnimationFrame(frame.current), []);

  function onScroll() {
    window.cancelAnimationFrame(frame.current);
    frame.current = window.requestAnimationFrame(() => {
      const el = deck.current;
      if (!el) return;
      const step = stepOf(el);
      if (!step) return;
      const next = Math.max(0, Math.min(list.length - 1, Math.round(Math.abs(el.scrollLeft) / step)));
      setAt((now) => (now === next ? now : next));
    });
  }

  function choose(key: string | null) {
    const next = key === chosen ? null : key;
    setChosen(next);
    setAt(0);
    // The new deck starts at its first card.
    window.requestAnimationFrame(() => scrollToCard(0, false));
  }

  function go(index: number) {
    const next = Math.max(0, Math.min(list.length - 1, index));
    setAt(next);
    scrollToCard(next, true);
  }

  const current = list[Math.min(at, list.length - 1)];
  const currentFather = current ? byKey.get(current.father) : undefined;
  const workLine = current ? [current.work, current.place].filter(Boolean).join(", ") : "";
  // The same object while the passage is the same: the picture sheet draws its preview again when it changes.
  const words = useMemo(
    () => (current ? { text: current.text, reference: current.name, lang: "en", ...(workLine ? { note: workLine } : {}) } : null),
    [current, workLine],
  );
  const lead: Look | undefined = useMemo(() => {
    const slug = currentFather?.saintSlug;
    const y = slug ? SAINT_FACES[slug] : undefined;
    return slug && y !== undefined && onDevice ? portraitLook(streamedUrl(coverFile(slug), native), y / 100) : undefined;
  }, [currentFather, native, onDevice]);

  if (!current) return null;

  return (
    <div data-fathers-deck="">
      {/* B: the Fathers by face, most quoted first. */}
      <div role="group" aria-label={t("footer.theFathers")} className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1 pt-1 md:mx-0 md:px-0">
        <Medallion on={chosen === null} label={t("common.all")} count={passages.length} onClick={() => choose(null)}>
          <span className="theology-all grid size-full place-items-center rounded-full font-serif text-[16px] font-bold text-paper/85">{passages.length}</span>
        </Medallion>
        {fathers.map((f) => {
          const picture = onDevice ? fatherPicture(f, native) : null;
          // A Father with a page has a picture, chosen once the page is on the device.
          const coming = !onDevice && Boolean(f.saintSlug);
          return (
            <Medallion key={f.key} on={chosen === f.key} label={medallionName(f.name)} english title={f.name} count={f.count} onClick={() => choose(f.key)}>
              {picture || coming ? (
                <span className="relative block size-full overflow-hidden rounded-full bg-night-soft">
                  {picture ? <SaintFace key={picture.src} picture={picture} zoom={1.4} /> : null}
                </span>
              ) : (
                <span className="theology-all grid size-full place-items-center rounded-full font-serif text-[16px] font-bold text-paper/85">
                  {medallionInitial(f.name)}
                </span>
              )}
            </Medallion>
          );
        })}
      </div>

      {/* C: the deck. */}
      <div className="mt-5 flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-[19px] font-bold leading-tight text-paper">{t("study.theology.fromTheFathers")}</h2>
        <span className="flex items-center gap-1">
          <span aria-live="polite" className="font-sans text-[12.5px] tabular-nums text-paper/55">
            {t("readingsFlow.of", { n: Math.min(at, list.length - 1) + 1, total: list.length })}
          </span>
          {/* On a computer, where a deck is not swiped. */}
          <button
            type="button"
            aria-label={t("common.previous")}
            disabled={at <= 0}
            onClick={() => go(at - 1)}
            className="tap-press ms-2 hidden size-9 place-items-center rounded-full border border-paper/15 text-paper/75 hover:text-paper disabled:opacity-30 md:grid"
          >
            <ChevronLeft size={16} className="rtl:-scale-x-100" />
          </button>
          <button
            type="button"
            aria-label={t("common.next")}
            disabled={at >= list.length - 1}
            onClick={() => go(at + 1)}
            className="tap-press hidden size-9 place-items-center rounded-full border border-paper/15 text-paper/75 hover:text-paper disabled:opacity-30 md:grid"
          >
            <ChevronRight size={16} className="rtl:-scale-x-100" />
          </button>
        </span>
      </div>

      <ul
        ref={deck}
        onScroll={onScroll}
        className="no-scrollbar -mx-5 mt-3 flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto scroll-px-5 px-5 pb-2 md:mx-0 md:scroll-px-0 md:px-0"
      >
        {list.map((p, i) => {
          const picture = onDevice ? fatherPicture(byKey.get(p.father), native) : null;
          const coming = !onDevice && Boolean(p.saintSlug);
          return (
            <li key={`${p.father}-${i}`} data-deck-card="" className="flex w-[272px] shrink-0 snap-start">
              <article
                data-current={i === at ? "" : undefined}
                className="theology-card relative flex min-h-[352px] w-full flex-col overflow-hidden rounded-[22px] pb-10"
              >
                <div className="relative h-[136px] shrink-0">
                  {picture ? (
                    <span className="theology-card-picture absolute inset-0 overflow-hidden">
                      <SaintFace key={picture.src} picture={picture} />
                    </span>
                  ) : coming ? null : (
                    <span aria-hidden className="absolute inset-0 grid place-items-center">
                      <span className="theology-ring grid size-16 place-items-center rounded-full font-serif text-[26px] font-bold text-paper/85">
                        {medallionInitial(p.name)}
                      </span>
                    </span>
                  )}
                </div>
                <div className="px-[22px] pt-2 text-center">
                  <blockquote lang="en" className="font-serif font-medium leading-[1.45] text-paper" style={{ fontSize: cardTextSize(p.text.length) }}>
                    {p.text}
                  </blockquote>
                  <div aria-hidden className="mx-auto mt-3 h-[1.5px] w-[30px] bg-paper/70" />
                  <p lang="en" className="mt-[9px] font-sans text-[9.5px] font-bold uppercase tracking-[0.16em] text-paper/75">
                    {p.saintSlug ? (
                      <Link href={`/saints/${p.saintSlug}`} prefetch={false} className="hover:text-paper">
                        {p.name}
                      </Link>
                    ) : (
                      p.name
                    )}
                  </p>
                  {p.work ? (
                    <p lang="en" className="mt-[3px] font-sans text-[10.5px] leading-[1.35] text-paper/50">
                      {p.work}
                      {p.place ? (
                        <>
                          <br />
                          {p.place}
                        </>
                      ) : null}
                    </p>
                  ) : null}
                  {p.inexact ? <p className="mt-1 font-sans text-[10.5px] text-paper/45">{t("cite.inexact")}</p> : null}
                </div>
                <p aria-hidden className="absolute inset-x-0 bottom-3 text-center font-sans text-[9.5px] font-semibold tracking-[0.04em] text-paper/55">
                  {FOOT.text}
                </p>
              </article>
            </li>
          );
        })}
      </ul>

      {/* Under the card in view: where it is from, and the picture of it. */}
      <div data-quote-tools="" className="mt-3 flex w-[272px] max-w-full items-center justify-center gap-2">
        {current.source ? (
          current.source.external ? (
            <a
              href={current.source.href}
              target="_blank"
              rel="noopener noreferrer"
              data-quote-source=""
              className="tap-press hit-44 inline-flex h-9 items-center gap-[7px] rounded-pill border border-paper/25 px-3 font-sans text-[12.5px] font-semibold text-paper"
            >
              <Book size={15} />
              {t("today.saintWords.readSource")}
            </a>
          ) : (
            <Link
              href={current.source.href}
              prefetch={false}
              data-quote-source=""
              className="tap-press hit-44 inline-flex h-9 items-center gap-[7px] rounded-pill border border-paper/25 px-3 font-sans text-[12.5px] font-semibold text-paper"
            >
              <Book size={15} />
              {t("today.saintWords.readSource")}
            </Link>
          )
        ) : null}
        <button
          type="button"
          data-quote-share=""
          onClick={() => setSharing(true)}
          className="reader-lit tap-press hit-44 inline-flex h-9 items-center gap-[7px] rounded-pill bg-paper px-3 font-sans text-[12.5px] font-semibold text-night"
        >
          <Share size={14} />
          {t("common.share")}
        </button>
      </div>

      {current.gloss ? <p className="mt-4 font-sans text-detail leading-[1.6] text-paper/60">{current.gloss}</p> : null}
      <div className="mt-2">
        <AddToFlorilegium
          key={`${current.father}-${at}`}
          item={{
            kind: "father",
            text: current.text,
            author: current.author,
            saintSlug: current.saintSlug,
            work: current.work,
            href: current.gatherHref,
          }}
        />
      </div>

      {sharing && words ? (
        <PictureSheet
          open={sharing}
          onClose={() => setSharing(false)}
          words={words}
          title={current.name}
          name={current.name}
          caption={workLine ? `${current.name}\n${workLine}` : current.name}
          referenceLabel={current.name}
          lead={lead}
          leadLabel={lead ? medallionName(current.name) : undefined}
        />
      ) : null}
    </div>
  );
}

/** A Father's face on the strip, with how many passages are his. */
function Medallion({
  on,
  label,
  english = false,
  title,
  count,
  onClick,
  children,
}: {
  on: boolean;
  label: string;
  /** A Father's name, which the app has in English. */
  english?: boolean;
  title?: string;
  count: number;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      // His name, then how many passages are his.
      aria-label={`${title ?? label}: ${count}`}
      title={title}
      onClick={onClick}
      className="tap-press flex w-[72px] shrink-0 flex-col items-center gap-[5px] pt-0.5"
    >
      <span className={cn("theology-face relative size-[46px] rounded-full", on && "theology-face-on")}>
        {children}
        <span
          className={cn(
            "theology-count absolute -bottom-[3px] -end-1 grid h-[18px] min-w-[18px] place-items-center rounded-full px-[5px] font-sans text-[10px] font-bold tabular-nums",
            on ? "bg-paper text-night" : "bg-night-soft text-paper/85",
          )}
        >
          {count}
        </span>
      </span>
      <span lang={english ? "en" : undefined} className={cn("line-clamp-2 max-w-full text-center font-sans text-[10.5px] font-semibold leading-tight", on ? "theology-face-name text-paper" : "text-paper/55")}>
        {label}
      </span>
    </button>
  );
}
