"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

import { AddToFlorilegium } from "@/components/florilegium/AddToFlorilegium";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { SaintFace } from "@/components/today/SaintFace";
import { Book } from "@/components/ui/icons/Book";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Share } from "@/components/ui/icons/Share";
import { isNativeClient } from "@/lib/platform/native";
import { CARD_LINES, CARD_TEXT, medallionInitial, type DeckPassage } from "@/lib/theology/page";
import { scrollBehavior } from "@/lib/ui/motion";
import { useMounted } from "@/lib/useMounted";

import { fatherPicture } from "./fatherPicture";
import { PassagePicture, ReadSource } from "./PassageTools";
import { useFolds } from "./useFolds";

/**
 * The Fathers' words at the end of a part (1.8, round 3 r3-13): C's "the
 * part's Fathers as a deck at its end", each passage B's picture card, "his
 * portrait above, the place and the actions on the card". The words verbatim
 * in English as the study has them, his name, the work and the place, then
 * the three actions on one line, evenly spaced (the owner's note 22 of build
 * 80): Read where it's from, Gather, Share, which makes the picture of the
 * passage. The study's own line on the passage stands under the deck.
 *
 * The cards share one height and swipe one at a time; the one in view
 * stands full and the next waits dim beside it. On a computer the deck
 * turns by two buttons. Pictures: his cover portrait, asked of the website
 * in the apps, with the icon the app carries when it cannot be had; his
 * initial in a ring for a text no Father the app has wrote.
 */
export function PassageDeck({ passages }: { passages: DeckPassage[] }) {
  const { t } = useTranslate();
  const onDevice = useMounted();
  const native = onDevice && isNativeClient();
  const [at, setAt] = useState(0);
  const [sharing, setSharing] = useState(false);
  const deck = useRef<HTMLUListElement>(null);
  const frame = useRef(0);
  useFolds(deck, passages);

  /** One card and its gap apart, as the deck scrolls. */
  const stepOf = useCallback((el: HTMLUListElement) => {
    const first = el.querySelector<HTMLElement>("[data-deck-card]");
    if (!first) return 0;
    const gap = parseFloat(window.getComputedStyle(el).columnGap || "0") || 0;
    return first.offsetWidth + gap;
  }, []);

  useEffect(() => () => window.cancelAnimationFrame(frame.current), []);

  function onScroll() {
    window.cancelAnimationFrame(frame.current);
    frame.current = window.requestAnimationFrame(() => {
      const el = deck.current;
      if (!el) return;
      const step = stepOf(el);
      if (!step) return;
      const next = Math.max(0, Math.min(passages.length - 1, Math.round(Math.abs(el.scrollLeft) / step)));
      setAt((now) => (now === next ? now : next));
    });
  }

  function go(index: number) {
    const el = deck.current;
    const next = Math.max(0, Math.min(passages.length - 1, index));
    setAt(next);
    if (!el) return;
    const rtl = window.getComputedStyle(el).direction === "rtl";
    el.scrollTo({ left: (rtl ? -1 : 1) * next * stepOf(el), behavior: scrollBehavior() });
  }

  if (passages.length === 0) return null;
  const current = passages[Math.min(at, passages.length - 1)];

  return (
    <section data-passage-deck="" className="mt-9">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-serif text-[18px] font-bold leading-tight text-paper">{t("study.theology.fromTheFathers")}</h3>
        <span className="flex items-center gap-1">
          <span aria-live="polite" className="font-sans text-[12.5px] tabular-nums text-paper/55">
            {t("readingsFlow.of", { n: Math.min(at, passages.length - 1) + 1, total: passages.length })}
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
            disabled={at >= passages.length - 1}
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
        className="no-scrollbar -mx-5 mt-3 flex snap-x snap-mandatory items-stretch gap-2.5 overflow-x-auto scroll-px-5 px-5 pb-2 md:mx-0 md:scroll-px-0 md:px-0"
      >
        {passages.map((p, i) => {
          const picture = onDevice && p.saintSlug ? fatherPicture({ saintSlug: p.saintSlug, iconUrl: p.iconUrl }, native) : null;
          const coming = !onDevice && Boolean(p.saintSlug);
          return (
            <li key={`${p.father}-${i}`} data-deck-card="" className="flex w-[min(318px,calc(100vw_-_56px))] shrink-0 snap-start">
              <article data-current={i === at ? "" : undefined} className="theology-card relative flex w-full flex-col overflow-hidden rounded-[22px] pb-5">
                <div className="relative h-[124px] shrink-0">
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
                {/* The words and their line, in the middle of what the card has
                    between his face and its actions: the cards share one
                    height, so a short passage is centred. A long one folds. */}
                <div className="flex flex-1 flex-col justify-center px-[22px] text-center">
                  <blockquote
                    lang="en"
                    data-card-words=""
                    className="post-fold font-serif font-medium text-paper"
                    style={
                      {
                        fontSize: CARD_TEXT.size,
                        lineHeight: CARD_TEXT.lineHeight,
                        "--fold-lines": CARD_LINES,
                        "--fold-lead": CARD_TEXT.lineHeight,
                      } as CSSProperties
                    }
                  >
                    {p.text}
                  </blockquote>
                  <div aria-hidden className="mx-auto mt-3 h-[1.5px] w-[30px] bg-paper/70" />
                  <p lang="en" className="mt-[9px] font-sans text-[9.5px] font-bold uppercase tracking-[0.16em] text-paper/78">
                    {p.saintSlug ? (
                      <Link href={`/saints/${p.saintSlug}`} prefetch={false} className="hover:text-paper">
                        {p.name}
                      </Link>
                    ) : (
                      p.name
                    )}
                  </p>
                  {p.work || p.place ? (
                    <p lang="en" className="mt-[3px] font-sans text-[11px] leading-[1.35] text-paper/50">
                      {p.work}
                      {p.work && p.place ? <br /> : null}
                      {p.place}
                    </p>
                  ) : null}
                  {p.inexact ? <p className="mt-1 font-sans text-[10.5px] text-paper/45">{t("cite.inexact")}</p> : null}
                </div>
              </article>
            </li>
          );
        })}
      </ul>

      {/* The card in view's three actions, on one line, evenly spaced, along
          its foot. Under the deck, not inside it: the deck scrolls sideways,
          so it clips, and Gather's menu opens below its button. */}
      <div
        data-quote-tools=""
        className="mt-1 flex w-[min(318px,calc(100vw_-_56px))] max-w-full items-center justify-between gap-2 border-t border-paper/8 pt-1.5"
      >
        {current.source ? (
          <ReadSource
            source={current.source}
            className="tap-press hit-44 inline-flex h-[34px] items-center gap-1.5 px-0.5 font-sans text-[12.5px] font-semibold text-paper/82 hover:text-paper"
          >
            <Book size={16} />
            {t("today.saintWords.readSource")}
          </ReadSource>
        ) : (
          <span aria-hidden />
        )}
        <AddToFlorilegium
          key={`${current.father}-${at}`}
          item={{ kind: "father", text: current.text, author: current.author, saintSlug: current.saintSlug, work: current.work, href: current.gatherHref }}
        />
        <button
          type="button"
          data-quote-share=""
          onClick={() => setSharing(true)}
          className="reader-lit tap-press hit-44 inline-flex h-[34px] items-center gap-1.5 rounded-pill bg-paper px-3 font-sans text-[12.5px] font-semibold text-night"
        >
          <Share size={14} />
          {t("common.share")}
        </button>
      </div>

      {current.gloss ? <p className="mt-3 font-sans text-detail leading-[1.6] text-paper/60">{current.gloss}</p> : null}

      <PassagePicture passage={current} open={sharing} onClose={() => setSharing(false)} onDevice={onDevice} native={native} />
    </section>
  );
}
