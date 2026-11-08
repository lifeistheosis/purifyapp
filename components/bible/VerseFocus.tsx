"use client";

import dynamic from "next/dynamic";
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { createPortal } from "react-dom";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PlusMark } from "@/components/billing/PlusMark";
import { Book } from "@/components/ui/icons/Book";
import { Copy } from "@/components/ui/icons/Copy";
import { CrossRefs } from "@/components/ui/icons/CrossRefs";
import { Flower } from "@/components/ui/icons/Flower";
import { LinkChain } from "@/components/ui/icons/LinkChain";
import { Pen } from "@/components/ui/icons/Pen";
import { Picture } from "@/components/ui/icons/Picture";
import { Share } from "@/components/ui/icons/Share";
import { Star } from "@/components/ui/icons/Star";
import { Sheet } from "@/components/ui/Sheet";
import { highlightVars } from "@/lib/bible/highlightPalette";
import { useAndroidBack } from "@/lib/platform/useAndroidBack";
import { shareText } from "@/lib/share/shareImage";
import { copyText } from "@/lib/ui/copyText";
import { createLiftGuard } from "@/lib/ui/liftGuard";
import { useReducedMotion } from "@/lib/ui/motion";
import { lockBodyScroll, setOverlayOpen, unlockBodyScroll } from "@/lib/ui/overlay";
import { softTick } from "@/lib/ui/softTick";

import { HighlightNamesSheet } from "./HighlightNamesSheet";
import { HighlightPicker } from "./HighlightPicker";

const PictureSheet = dynamic(() => import("@/components/share/PictureSheet").then((m) => m.PictureSheet), { ssr: false });

/** Study's mark: two Greek letters, the same in every language (not a word to translate). */
const GREEK_MARK = "αβ";
/** How long the close takes before the focus is gone: the tools, then the page (globals.css). */
const CLOSE_MS = 300;
const CLOSE_MS_REDUCED = 200;

export type StudyRow = { key: string; label: string; onSelect: () => void; locked?: boolean };

/**
 * The verse's focus (1.9, the owner's pick C of 2026-11-08, on build 88): a
 * tap on a verse steps the page back and lifts the verse into a card, the
 * highlight colours above it and the tools below it: Copy, Share, Image,
 * Note, Study. It replaced the strip under the verse (his pick B of
 * 2026-11-06), which he found plain once it was on his phone: "I don't like
 * any of it ... plain, not premium", and of the three versions drawn after
 * it, "C, and ensure it's smooth with animations".
 *
 * Its motion is the house's (app/globals.css, "The verse's focus"): the page
 * steps back, the card rises from where the verse is to its own place, then
 * the colours and the tools arrive in reading order; it closes in two steps,
 * the tools and the card first, then the page. A plain fade under reduced
 * motion. No blur: the Android WebView bleeds a picture through
 * backdrop-filter and drops frames.
 *
 * Portaled to <body> at the sheets' layer, over the tab bar. A tap on the
 * page behind, Escape and Android's back close it, and the page under it
 * does not scroll. Phones and the apps' tablets; the computer keeps its hover
 * toolbar and its right-click menu.
 */
export function VerseFocus({
  reference,
  verseText,
  edition,
  link,
  anchor,
  highlight,
  copied,
  onCopy,
  onNote,
  onWord,
  study,
  onClose,
}: {
  reference: string;
  verseText: string;
  /** The Bible the words are from, for the card and the picture: "KJV", "Brenton". */
  edition: string;
  /** The verse's own address, to share. */
  link: string;
  /** The verse's words on the page: the card rises from where they are. */
  anchor: RefObject<HTMLElement | null>;
  highlight: { color: string | null; onPick: (id: string) => void; onRemove: () => void };
  copied: boolean;
  onCopy: () => void;
  onNote: () => void;
  /** A word of the card tapped, by its place in the verse: its Greek (where the chapter has it). */
  onWord?: (idx: number, el: HTMLElement) => void;
  study: StudyRow[];
  onClose: () => void;
}) {
  const { t } = useTranslate();
  const reduced = useReducedMotion();
  const root = useRef<HTMLDivElement | null>(null);
  const card = useRef<HTMLElement | null>(null);
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const [studyOpen, setStudyOpen] = useState(false);
  const [picture, setPicture] = useState(false);
  /** The colours' names being edited (HighlightNamesSheet): undefined when closed. */
  const [naming, setNaming] = useState<string | null | undefined>(undefined);
  const [lift] = useState(createLiftGuard);

  // The card rises from the verse: how far, measured before the first frame
  // is painted; then data-ready goes on and the motion begins with it
  // (app/globals.css), so the card never starts from the wrong place.
  useLayoutEffect(() => {
    const from = anchor.current?.getBoundingClientRect();
    const to = card.current?.getBoundingClientRect();
    if (card.current && from && to) card.current.style.setProperty("--lift", `${Math.round(from.top - to.top)}px`);
    root.current?.setAttribute("data-ready", "");
  }, [anchor]);

  // Closing takes its two steps, then the verse lets the focus go.
  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    window.setTimeout(onClose, reduced ? CLOSE_MS_REDUCED : CLOSE_MS);
  }, [onClose, reduced]);

  // A soft tick in the hand as it opens; the page holds still under it.
  useEffect(() => {
    softTick();
    lockBodyScroll();
    setOverlayOpen(true);
    return () => {
      unlockBodyScroll();
      setOverlayOpen(false);
    };
  }, []);

  useEffect(() => {
    if (studyOpen || picture || naming !== undefined) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [studyOpen, picture, naming, close]);
  useAndroidBack(!studyOpen && !picture && naming === undefined, close);

  // The finger that tapped the verse may lift onto a tool (lib/ui/liftGuard).
  useEffect(() => {
    const lifted = () => lift.noteLift();
    window.addEventListener("touchend", lifted, { passive: true });
    window.addEventListener("touchcancel", lifted, { passive: true });
    return () => {
      window.removeEventListener("touchend", lifted);
      window.removeEventListener("touchcancel", lifted);
    };
  }, [lift]);

  // A tool answers a tap, never the lift of the finger that opened the focus.
  const unlessLift = (fn: () => void) => {
    if (!lift.isLift()) fn();
  };

  // The phone's own share sheet in the apps (the Share plugin), the Web Share
  // API in a browser, and with neither the words and the link copied
  // (lib/share/shareImage.ts, shareText; lib/ui/copyText.ts).
  async function share() {
    const text = `“${verseText}” ${reference}`;
    const outcome = await shareText(reference, text, link);
    if (outcome === "dismissed") return;
    if (outcome === "failed") await copyText(`${text}\n${link}`);
    close();
  }

  const color = highlight.color;
  const part = (i: number): CSSProperties => ({ ["--i" as string]: i });
  const row =
    "tap-press flex min-h-[52px] w-full items-center justify-between gap-3 px-[18px] text-start font-sans text-ui text-paper/95 active:bg-paper/[0.06]";

  // Only ever drawn after a tap, so never on the server.
  if (typeof document === "undefined") return null;

  return (
    <>
      {createPortal(
        <div
          ref={root}
          data-verse-focus=""
          data-closing={closing ? "" : undefined}
          role="dialog"
          aria-modal="true"
          aria-label={t("bible.verseActionsFor", { reference })}
          className="verse-focus md:hidden native-md-block fixed inset-0 z-[60]"
        >
          <button type="button" tabIndex={-1} aria-label={t("common.close")} onClick={close} className="verse-focus-scrim absolute inset-0 bg-night/85" />
          <div className="pointer-events-none absolute inset-x-4 bottom-4 top-[calc(env(safe-area-inset-top,0px)+1rem)] flex flex-col justify-center gap-3 overflow-y-auto">
            <div className="verse-focus-part pointer-events-auto rounded-3xl border border-paper/[0.12] bg-night-soft px-1 py-1.5" style={part(0)}>
              <HighlightPicker
                active={color}
                onPick={highlight.onPick}
                onRemove={highlight.onRemove}
                onNames={(id) => setNaming(id)}
                hint={t("bible.highlightVerse")}
                guard={() => lift.isLift()}
              />
            </div>
            <article
              ref={card}
              className="verse-focus-card pointer-events-auto rounded-[28px] border border-paper/[0.12] bg-night-soft px-[22px] pb-6 pt-5 shadow-[0_0_70px_color-mix(in_oklab,var(--color-paper)_9%,transparent),0_24px_60px_rgb(0_0_0/0.45)]"
            >
              <p className="font-sans text-caption font-semibold text-paper/70">
                {reference} · {edition}
              </p>
              {/* A word tapped opens its Greek, as the page's words do (the owner's
                  "tap the English word", 1.9); Study's Greek is the way there by
                  keyboard. The words wear the page's dotted line where they can. */}
              {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
              <p
                className={"mt-2.5 font-serif text-[22px] leading-[1.55] text-paper" + (onWord ? " verse-ghost-words" : "")}
                onClick={
                  onWord
                    ? (e) => {
                        const el = (e.target as Element).closest<HTMLElement>("[data-word-idx]");
                        const idx = el ? Number(el.dataset.wordIdx) : NaN;
                        if (el && Number.isFinite(idx) && !lift.isLift()) onWord(idx, el);
                      }
                    : undefined
                }
              >
                <span
                  data-hl-color={color ?? undefined}
                  style={color ? highlightVars(color) : undefined}
                  className={color ? "box-decoration-clone rounded-[6px] bg-[var(--hl-verse)] motion-safe:transition-[background-color] motion-safe:duration-200" : undefined}
                >
                  {verseText
                    .trim()
                    .split(/\s+/)
                    .map((w, i) => (
                      <Fragment key={i}>
                        {i ? " " : null}
                        <span data-word-idx={i}>{w}</span>
                      </Fragment>
                    ))}
                </span>
              </p>
            </article>
            <div role="menu" aria-label={reference} className="verse-focus-part pointer-events-auto overflow-hidden rounded-[22px] border border-paper/[0.12] bg-night-soft" style={part(1)}>
              <button type="button" role="menuitem" className={row} onClick={() => unlessLift(onCopy)}>
                <span>{copied ? t("common.copied") : t("common.copy")}</span>
                <Copy size={20} />
              </button>
              <button type="button" role="menuitem" className={`${row} verse-focus-part border-t border-paper/10`} style={part(2)} onClick={() => unlessLift(() => void share())}>
                <span>{t("common.share")}</span>
                <Share size={20} />
              </button>
              <button type="button" role="menuitem" className={`${row} verse-focus-part border-t border-paper/10`} style={part(3)} onClick={() => unlessLift(() => setPicture(true))}>
                <span>{t("bible.strip.image")}</span>
                <Picture size={20} />
              </button>
              <button type="button" role="menuitem" className={`${row} verse-focus-part border-t border-paper/10`} style={part(4)} onClick={() => unlessLift(onNote)}>
                <span>{t("bible.strip.note")}</span>
                <Pen size={20} />
              </button>
              <button type="button" role="menuitem" aria-haspopup="dialog" className={`${row} verse-focus-part border-t border-paper/10`} style={part(5)} onClick={() => unlessLift(() => setStudyOpen(true))}>
                <span>{t("bible.strip.study")}</span>
                <span aria-hidden className="font-serif text-[19px] leading-[22px]">
                  {GREEK_MARK}
                </span>
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      <StudySheet open={studyOpen} reference={reference} edition={edition} verseText={verseText} study={study} onClose={() => setStudyOpen(false)} />

      <HighlightNamesSheet open={naming !== undefined} focusId={naming ?? null} onClose={() => setNaming(undefined)} />

      {picture ? (
        <PictureSheet
          open={picture}
          onClose={() => {
            setPicture(false);
            close();
          }}
          words={{ text: verseText, reference, note: edition }}
          title={t("picture.title")}
          name={reference}
          caption={`${reference}\n${edition}`}
        />
      ) : null}
    </>
  );
}

/** Each of Study's tools by its mark, from the house's icons. */
function studyIcon(key: string) {
  switch (key) {
    case "greek":
      return (
        <span aria-hidden className="font-serif text-[19px] leading-[22px]">
          {GREEK_MARK}
        </span>
      );
    case "crossrefs":
      return <CrossRefs size={20} />;
    case "commentary":
      return <Book size={20} />;
    case "bookmark":
      return <Star size={20} />;
    case "gather":
      return <Flower size={20} />;
    case "quote":
      return <Copy size={20} />;
    case "link":
      return <LinkChain size={20} />;
    default:
      return <Book size={20} />;
  }
}

/**
 * Study, as cards (1.9, with the focus): the verse in its words, then each of
 * what studies it and what the old hold menu held besides, two to a row. A
 * Plus tool wears the one Plus mark and opens the upgrade sheet named for it.
 */
function StudySheet({
  open,
  reference,
  edition,
  verseText,
  study,
  onClose,
}: {
  open: boolean;
  reference: string;
  edition: string;
  verseText: string;
  study: StudyRow[];
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={`${reference} · ${edition}`}>
      <p className="font-serif text-body leading-[1.6] text-paper/85">{verseText}</p>
      <ul className="mt-4 grid grid-cols-2 gap-2.5 pb-2">
        {study.map((s) => (
          <li key={s.key}>
            <button
              type="button"
              onClick={() => {
                onClose();
                s.onSelect();
              }}
              className="tap-press flex min-h-[104px] w-full flex-col items-start gap-3 rounded-[20px] border border-paper/[0.09] bg-paper/[0.06] p-3.5 text-start"
            >
              <span className="flex w-full items-center justify-between gap-2">
                <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-paper/[0.09] text-paper/95">{studyIcon(s.key)}</span>
                {s.locked ? <PlusMark /> : null}
              </span>
              <span className="font-sans text-[15px] font-semibold leading-snug text-paper/95">{s.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
