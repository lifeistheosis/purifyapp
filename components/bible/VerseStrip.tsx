"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Copy } from "@/components/ui/icons/Copy";
import { Pen } from "@/components/ui/icons/Pen";
import { Picture } from "@/components/ui/icons/Picture";
import { Share } from "@/components/ui/icons/Share";
import { Sheet } from "@/components/ui/Sheet";
import { colorById } from "@/lib/bible/highlightPalette";
import { createLiftGuard } from "@/lib/ui/liftGuard";
import { setOverlayOpen } from "@/lib/ui/overlay";

import { HighlightNamesSheet } from "./HighlightNamesSheet";
import { HighlightPicker } from "./HighlightPicker";

const PictureSheet = dynamic(() => import("@/components/share/PictureSheet").then((m) => m.PictureSheet), { ssr: false });

/** Study's mark: two Greek letters, the same in every language (not a word to translate). */
const GREEK_MARK = "\u03b1\u03b2";
/** A page scrolled this far with the strip up has been read on: the strip goes. */
const SCROLL_AWAY_PX = 24;
/** Closer than this to the foot of the screen, the strip opens above the verse. */
const ROOM_BELOW_PX = 190;

export type StudyRow = { key: string; label: string; onSelect: () => void; locked?: boolean };

/**
 * The verse strip (1.9, the owner's pick B of 2026-11-06): a tap on a verse
 * selects it and this strip opens just under it, with Highlight, Copy,
 * Share, Image, Note and Study. Highlight opens the colours in the strip
 * itself; Study opens a sheet with what is for studying the verse (the Greek,
 * cross-references, the commentary) and what the old hold menu held besides
 * (the bookmark, the Florilegium, the link, the verse as a quote).
 *
 * It stands in the page, not over the tab bar (the old MobileVerseToolbar,
 * still the Fathers reader's), so it is beside the words it acts on. No
 * backdrop: a tap on the verse's own words still reaches them (a word's
 * Greek), and a tap anywhere else puts the strip away, as do Escape and a
 * scroll of the page.
 *
 * Phones and tablets in the apps only; the computer keeps its hover toolbar.
 */
export function VerseStrip({
  reference,
  verseText,
  edition,
  link,
  highlight,
  copied,
  onCopy,
  onNote,
  study,
  onClose,
}: {
  reference: string;
  verseText: string;
  /** The Bible the words are from, for the picture's line: "KJV", "Brenton". */
  edition: string;
  /** The verse's own address, to share. */
  link: string;
  highlight: { color: string | null; onPick: (id: string) => void; onRemove: () => void };
  copied: boolean;
  onCopy: () => void;
  onNote: () => void;
  study: StudyRow[];
  onClose: () => void;
}) {
  const { t } = useTranslate();
  const strip = useRef<HTMLDivElement | null>(null);
  const [colours, setColours] = useState(false);
  const [studyOpen, setStudyOpen] = useState(false);
  const [picture, setPicture] = useState(false);
  /** The colours' names being edited (HighlightNamesSheet): undefined when closed. */
  const [naming, setNaming] = useState<string | null | undefined>(undefined);
  const [above, setAbove] = useState(false);
  const [lift] = useState(createLiftGuard);

  // Above the verse when there is no room under it.
  useEffect(() => {
    const verse = strip.current?.parentElement;
    if (!verse) return;
    const r = verse.getBoundingClientRect();
    setAbove(window.innerHeight - r.bottom < ROOM_BELOW_PX && r.top > ROOM_BELOW_PX);
  }, []);

  // Away on a tap outside the verse and the strip, on Escape, and on a scroll.
  useEffect(() => {
    if (studyOpen || picture || naming !== undefined) return;
    const verse = strip.current?.parentElement ?? null;
    const down = (e: PointerEvent) => {
      const at = e.target as Node | null;
      if (at && (strip.current?.contains(at) || verse?.contains(at))) return;
      onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const y0 = window.scrollY;
    const scroll = () => {
      if (Math.abs(window.scrollY - y0) > SCROLL_AWAY_PX) onClose();
    };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", scroll, { passive: true });
    return () => {
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", scroll);
    };
  }, [onClose, studyOpen, picture, naming]);

  // The install banner steps aside while the strip is up (lib/ui/overlay).
  useEffect(() => {
    setOverlayOpen(true);
    return () => setOverlayOpen(false);
  }, []);

  // The finger that held the verse may lift onto a button (lib/ui/liftGuard).
  useEffect(() => {
    const lifted = () => lift.noteLift();
    window.addEventListener("touchend", lifted, { passive: true });
    window.addEventListener("touchcancel", lifted, { passive: true });
    return () => {
      window.removeEventListener("touchend", lifted);
      window.removeEventListener("touchcancel", lifted);
    };
  }, [lift]);

  const guard = (fn: () => void) => () => {
    if (lift.isLift()) return;
    fn();
  };

  async function share() {
    const text = `“${verseText}” ${reference}`;
    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title: reference, text, url: link });
        onClose();
        return;
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${link}`);
    } catch {
      /* nothing to do: the strip stays for another try */
    }
    onClose();
  }

  const tool =
    "tap-press flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-1 py-2 font-sans text-[11px] font-medium text-paper/75 active:bg-paper/10";
  const dot = highlight.color ? colorById(highlight.color) : null;

  return (
    <>
      <div
        ref={strip}
        data-verse-strip=""
        role="toolbar"
        aria-label={t("bible.verseActionsFor", { reference })}
        className={
          "press-pill-in absolute inset-x-0 z-40 md:hidden native-md-block rounded-[20px] border border-paper/15 bg-night/95 px-1.5 py-1 shadow-[0_12px_36px_rgba(0,0,0,0.55)] backdrop-blur " +
          (above ? "bottom-full mb-1.5" : "top-full mt-1.5")
        }
      >
        {colours ? (
          <div className="px-1 py-1">
            <HighlightPicker
              active={highlight.color}
              onPick={highlight.onPick}
              onRemove={highlight.onRemove}
              onNames={(id) => setNaming(id)}
              hint={t("bible.highlightVerse")}
              guard={() => lift.isLift()}
            />
            <button
              type="button"
              onClick={() => setColours(false)}
              className="tap-press mt-1 min-h-11 w-full rounded-2xl font-sans text-[12.5px] font-medium text-paper/70"
            >
              {t("common.done")}
            </button>
          </div>
        ) : (
          <div className="flex items-stretch justify-between">
            <button type="button" className={tool} onClick={guard(() => setColours(true))} aria-expanded={colours}>
              <span
                aria-hidden
                className="h-[22px] w-[22px] rounded-full ring-2 ring-paper/40"
                style={{ background: dot ? "var(--hl-swatch)" : "transparent" }}
              />
              {t("bible.strip.highlight")}
            </button>
            <button type="button" className={tool} onClick={guard(onCopy)}>
              <Copy size={22} />
              {copied ? t("common.copied") : t("common.copy")}
            </button>
            <button type="button" className={tool} onClick={guard(() => void share())}>
              <Share size={22} />
              {t("common.share")}
            </button>
            <button type="button" className={tool} onClick={guard(() => setPicture(true))}>
              <Picture size={22} />
              {t("bible.strip.image")}
            </button>
            <button type="button" className={tool} onClick={guard(onNote)}>
              <Pen size={22} />
              {t("bible.strip.note")}
            </button>
            <button type="button" className={tool} onClick={guard(() => setStudyOpen(true))} aria-haspopup="dialog">
              <span aria-hidden className="font-serif text-[18px] leading-[22px]">
                {GREEK_MARK}
              </span>
              {t("bible.strip.study")}
            </button>
          </div>
        )}
      </div>

      <Sheet open={studyOpen} onClose={() => setStudyOpen(false)} title={reference}>
        <ul className="pb-2">
          {study.map((row) => (
            <li key={row.key}>
              <button
                type="button"
                onClick={() => {
                  setStudyOpen(false);
                  row.onSelect();
                }}
                className="tap-press flex min-h-12 w-full items-center justify-between rounded-xl px-2 text-left font-sans text-ui text-paper"
              >
                <span>{row.label}</span>
                {row.locked ? (
                  <span className="rounded-pill border border-paper/15 px-2 py-0.5 font-sans text-[11px] font-semibold text-paper/60">
                    {t("plus.badge")}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </Sheet>

      <HighlightNamesSheet open={naming !== undefined} focusId={naming ?? null} onClose={() => setNaming(undefined)} />

      {picture ? (
        <PictureSheet
          open={picture}
          onClose={() => {
            setPicture(false);
            onClose();
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
