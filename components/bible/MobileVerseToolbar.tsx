"use client";

import { useEffect, useRef, useState } from "react";
import { createLiftGuard } from "@/lib/ui/liftGuard";
import { setOverlayOpen } from "@/lib/ui/overlay";
import { Check } from "@/components/ui/icons/Check";
import { Copy } from "@/components/ui/icons/Copy";
import { CrossRefs } from "@/components/ui/icons/CrossRefs";
import { Flower } from "@/components/ui/icons/Flower";
import { LinkChain } from "@/components/ui/icons/LinkChain";
import { Pen } from "@/components/ui/icons/Pen";
import { Star } from "@/components/ui/icons/Star";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";
import { HighlightPicker } from "./HighlightPicker";
import { HighlightNamesSheet } from "./HighlightNamesSheet";

export type MobileVerseAction = "bookmark" | "copyText" | "copyLink" | "note" | "gather" | "crossRefs";

type ActionState = {
  bookmarked: boolean;
  hasNote: boolean;
  copied: boolean;
  /** The verse has cross-references to open (Bible reader, New Testament). */
  hasCrossRefs?: boolean;
};

/**
 * A verse's tools on a phone, or a paragraph's in a Father's work: Purify's
 * own hold. It opens on a long press, floats above the tab bar, and goes on a
 * tap outside, Escape, a scroll of the page, or any of its actions.
 *
 * In the phone apps it is the only hold there is: the system's selection is
 * off there since 1.5.2 (app/globals.css, "The apps select nothing by
 * themselves"), at the owner's word, so it carries Copy for the words beside
 * the link it always had.
 *
 * One card since 1.7.1. Its top is the colour of the highlight
 * (HighlightPicker): six colours, the one the words wear checked, what it
 * means to the reader written above them, Remove, and the way to the names.
 * Choosing a colour leaves the card up, so the words can be seen in it and
 * the colour changed with one more tap, or taken away; a scroll of the page
 * puts it away, as reading on would. Under a hairline, the rest: Copy, the
 * link, the star, a note, the Greek's echoes where a verse has them, and the
 * Florilegium. The spark that toggled a highlight in the last colour is gone,
 * since a colour tapped is a highlight made; so is the button that cleared a
 * verse's word highlights, since Remove takes those too. Six tools at most,
 * so one row holds them at 360px.
 *
 * Only below the `md:` breakpoint (and on a tablet in the apps); the hover
 * toolbar in VerseRow is the computer's.
 */

/** aria-label message keys per annotatable unit. The Bible reader reads
 * "verse", the Fathers reader passes "paragraph" and bookmarks the
 * enclosing "section". Whole sentences per noun, so inflected languages
 * stay grammatical instead of receiving a noun spliced into a phrase. */
const ITEM_LABEL_KEYS: Record<
  string,
  { actions: string; dismiss: string; highlight: string; copyText: string; copyLink: string }
> = {
  verse: {
    actions: "bible.verseActionsFor",
    dismiss: "bible.dismissVerseActions",
    highlight: "bible.highlightVerse",
    copyText: "bible.copyVerse",
    copyLink: "bible.copyVerseLink",
  },
  paragraph: {
    actions: "saints.paragraphActionsFor",
    dismiss: "saints.dismissParagraphActions",
    highlight: "saints.highlightParagraph",
    copyText: "saints.copyParagraph",
    copyLink: "saints.copyParagraphLink",
  },
};

const BOOKMARK_LABEL_KEYS: Record<string, string> = {
  verse: "bible.bookmarkVerse",
  section: "saints.bookmarkThisSection",
};

/** A page scrolled this far with the card up has been read on: the card goes. */
const SCROLL_AWAY_PX = 24;

const TOOL =
  "tap-press grid h-11 w-11 min-w-0 shrink place-items-center rounded-full text-paper/80 motion-safe:transition-colors active:bg-paper/10";

export function MobileVerseToolbar({
  reference,
  state,
  onAction,
  onClose,
  highlight,
  itemNoun = "verse",
  bookmarkNoun,
  gather = true,
}: {
  reference: string;
  state: ActionState;
  onAction: (a: MobileVerseAction) => void;
  onClose: () => void;
  /** The highlight: its colour now (null when there is none), a colour
   * chosen, and the highlight taken away. */
  highlight: { color: string | null; onPick: (id: string) => void; onRemove: () => void };
  /** What a single annotatable unit is called, for accurate a11y labels.
   * Defaults to "verse" (Bible reader); the Fathers reader passes
   * "paragraph". */
  itemNoun?: string;
  /** What the bookmark targets, when it differs from `itemNoun`. The
   * Fathers reader bookmarks the whole section, not the paragraph. */
  bookmarkNoun?: string;
  /** Whether the Florilegium button is offered. The Fathers reader has no
   * gathering wired, and its button did nothing (the highlight spec's D1). */
  gather?: boolean;
}) {
  const { t } = useTranslate();
  const bmNoun = bookmarkNoun ?? itemNoun;
  const itemKeys = ITEM_LABEL_KEYS[itemNoun] ?? ITEM_LABEL_KEYS.verse;
  const bookmarkKey = BOOKMARK_LABEL_KEYS[bmNoun] ?? BOOKMARK_LABEL_KEYS.verse;

  // The names sheet, over the card: the colour it opens at, or undefined
  // while it is shut.
  const [naming, setNaming] = useState<string | null | undefined>(undefined);
  const namingRef = useRef(false);
  // Where the page stood when the card came up, or when the names sheet
  // last let it go (a keyboard can move the page under a sheet).
  const scrollFrom = useRef<number | null>(null);
  useEffect(() => {
    namingRef.current = naming !== undefined;
    if (naming === undefined) scrollFrom.current = window.scrollY;
  }, [naming]);

  // Close on Escape, unless the names sheet is up: Escape is its own then.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !namingRef.current) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // A scroll of the page puts the card away: the reader has read on. Not
  // while the names sheet is up, which holds the page still.
  useEffect(() => {
    function onScroll() {
      const from = scrollFrom.current;
      if (namingRef.current || from === null) return;
      if (Math.abs(window.scrollY - from) > SCROLL_AWAY_PX) onClose();
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [onClose]);

  // Flag the global overlay so the PWA install banner steps aside while
  // the toolbar is up.
  useEffect(() => {
    setOverlayOpen(true);
    return () => setOverlayOpen(false);
  }, []);

  // The finger that opened this card is still on the glass when it appears.
  // Its lift can arrive as a tap on what is now under it, the backdrop or one
  // of the buttons, and close or fire the card before it has been read
  // (lib/ui/liftGuard.ts). A tap that soon after a lift is the lift.
  const [lift] = useState(createLiftGuard);
  useEffect(() => {
    const lifted = () => lift.noteLift();
    window.addEventListener("touchend", lifted, { passive: true });
    window.addEventListener("touchcancel", lifted, { passive: true });
    return () => {
      window.removeEventListener("touchend", lifted);
      window.removeEventListener("touchcancel", lifted);
    };
  }, [lift]);

  // Tap-outside dismiss via a transparent backdrop. We do NOT lock body
  // scroll, the toolbar is a transient affordance, not a modal.

  function handle(a: MobileVerseAction) {
    if (lift.isLift()) return;
    onAction(a);
    onClose();
  }

  return (
    <div className="md:hidden native-md-block fixed inset-0 z-[55]" role="dialog" aria-modal="false" aria-label={t(itemKeys.actions, { reference })}>
      {/* Transparent backdrop to capture outside taps. */}
      <button
        type="button"
        aria-label={t(itemKeys.dismiss)}
        onClick={() => {
          if (!lift.isLift()) onClose();
        }}
        className="absolute inset-0 bg-transparent"
      />
      {/* The card, at the bottom of the viewport, lifted above the mobile
          tab bar and the iOS home indicator. Same math as MobileChapterPill
          so the two stack predictably when both are visible. */}
      <div
        className="pointer-events-none absolute inset-x-0 flex justify-center px-4"
        style={{
          bottom: "calc(var(--tab-bar-h) + var(--now-playing-h) + env(safe-area-inset-bottom, 0px) + 12px)",
        }}
      >
        <div
          data-verse-tools=""
          // The card, not the layer it stands in, is what covers the foot of
          // the screen while it is open (lib/ui/readingPlace.ts).
          data-screen-edge="bottom"
          className="press-pill-in pointer-events-auto w-full max-w-[20rem] rounded-[26px] border border-paper/15 bg-night/95 px-1.5 pb-1.5 pt-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.55)] backdrop-blur"
        >
          <HighlightPicker
            active={highlight.color}
            onPick={highlight.onPick}
            onRemove={highlight.onRemove}
            onNames={(id) => setNaming(id)}
            hint={t(itemKeys.highlight)}
            guard={() => lift.isLift()}
          />
          <div aria-hidden className="mx-3 my-1.5 h-px bg-paper/10" />
          {/* The width of the colours above, so six tools stand under six discs. */}
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => handle("copyText")} aria-label={t(itemKeys.copyText)} className={TOOL}>
              <Copy size={19} />
            </button>
            <button
              type="button"
              onClick={() => handle("copyLink")}
              aria-label={state.copied ? t("common.linkCopied") : t(itemKeys.copyLink)}
              className={cn(TOOL, state.copied && "text-emerald-300")}
            >
              {state.copied ? <Check size={19} /> : <LinkChain size={19} />}
            </button>
            <button
              type="button"
              onClick={() => handle("bookmark")}
              aria-label={state.bookmarked ? t("study.saved.removeBookmark") : t(bookmarkKey)}
              aria-pressed={state.bookmarked}
              className={cn(TOOL, state.bookmarked && "text-paper")}
            >
              <Star size={19} filled={state.bookmarked} />
            </button>
            <button
              type="button"
              onClick={() => handle("note")}
              aria-label={state.hasNote ? t("bible.editNote") : t("bible.addNote")}
              aria-pressed={state.hasNote}
              className={cn(TOOL, state.hasNote && "bg-paper/12 text-paper")}
            >
              <Pen size={19} />
            </button>
            {state.hasCrossRefs ? (
              <button type="button" onClick={() => handle("crossRefs")} aria-label={t("bible.crossRefs")} className={TOOL}>
                <CrossRefs size={19} />
              </button>
            ) : null}
            {gather ? (
              <button type="button" onClick={() => handle("gather")} aria-label={t("bible.gatherToFlorilegium")} className={TOOL}>
                <Flower size={19} />
              </button>
            ) : null}
          </div>
        </div>
      </div>
      <HighlightNamesSheet open={naming !== undefined} focusId={naming ?? null} onClose={() => setNaming(undefined)} />
    </div>
  );
}
