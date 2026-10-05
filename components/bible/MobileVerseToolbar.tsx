"use client";

import { useEffect, useState } from "react";
import { createLiftGuard } from "@/lib/ui/liftGuard";
import { setOverlayOpen } from "@/lib/ui/overlay";
import { Check } from "@/components/ui/icons/Check";
import { Copy } from "@/components/ui/icons/Copy";
import { CrossRefs } from "@/components/ui/icons/CrossRefs";
import { Erase } from "@/components/ui/icons/Erase";
import { Flower } from "@/components/ui/icons/Flower";
import { LinkChain } from "@/components/ui/icons/LinkChain";
import { Pen } from "@/components/ui/icons/Pen";
import { Sparkle } from "@/components/ui/icons/Sparkle";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Star } from "@/components/ui/icons/Star";

export type MobileVerseAction =
 | "highlight"
 | "bookmark"
 | "copyText"
 | "copyLink"
 | "note"
 | "gather"
 | "clearWords"
 | "crossRefs";

type ActionState = {
 highlighted: boolean;
 bookmarked: boolean;
 hasNote: boolean;
 hasWordHighlights: boolean;
 copied: boolean;
 /** The verse has cross-references to open (Bible reader, New Testament). */
 hasCrossRefs?: boolean;
};

/**
 * Mobile contextual action bar for a single verse. Floats above the
 * bottom of the viewport like the iOS contextual toolbar; opens on
 * long-press, dismisses on outside-tap, Escape, or after any action.
 *
 * This is Purify's own hold. In the phone apps it is the only one: the
 * system's text selection is off there since 1.5.2 (app/globals.css, "The
 * apps select nothing by themselves"), at the owner's word, so the pill
 * carries Copy for the words themselves, beside the link it always had.
 * With it the pill can hold eight buttons, more than a phone is wide. Six
 * still fit on one row at 360px. Seven or eight are set as two rows of four
 * and three, or four and four: left to wrap by itself the pill broke six and
 * one, with the last button alone under the others.
 *
 * Only renders below the `md:` breakpoint, the per-verse hover-revealed
 * desktop toolbar in VerseRow is untouched.
 */
export type HighlightSwatch = { id: string; swatch: string; label: string };

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

export function MobileVerseToolbar({
 reference,
 state,
 onAction,
 onClose,
 itemNoun = "verse",
 bookmarkNoun,
 palette,
 activeColor,
 onColor,
}: {
 reference: string;
 state: ActionState;
 onAction: (a: MobileVerseAction) => void;
 onClose: () => void;
 /** Highlight color choices. When provided (Bible reader), a swatch row
 * sits above the action pill so the reader can recolor a highlight. */
 palette?: HighlightSwatch[];
 /** Currently selected color id, for the active ring on its swatch. */
 activeColor?: string;
 /** Pick a color. Closes the toolbar after applying, like other actions. */
 onColor?: (id: string) => void;
 /** What a single annotatable unit is called, for accurate a11y labels.
 * Defaults to "verse" (Bible reader); the Fathers reader passes
 * "paragraph". */
 itemNoun?: string;
 /** What the bookmark targets, when it differs from `itemNoun`. The
 * Fathers reader bookmarks the whole section, not the paragraph. */
 bookmarkNoun?: string;
}) {
  const { t } = useTranslate();
 const bmNoun = bookmarkNoun ?? itemNoun;
 const itemKeys = ITEM_LABEL_KEYS[itemNoun] ?? ITEM_LABEL_KEYS.verse;
 const bookmarkKey = BOOKMARK_LABEL_KEYS[bmNoun] ?? BOOKMARK_LABEL_KEYS.verse;
 // Close on Escape.
 useEffect(() => {
 function onKey(e: KeyboardEvent) {
 if (e.key === "Escape") onClose();
 }
 window.addEventListener("keydown", onKey);
 return () => window.removeEventListener("keydown", onKey);
 }, [onClose]);

 // Flag the global overlay so the PWA install banner steps aside while
 // the toolbar is up.
 useEffect(() => {
 setOverlayOpen(true);
 return () => setOverlayOpen(false);
 }, []);

 // The finger that opened this pill is still on the glass when it appears.
 // Its lift can arrive as a tap on what is now under it, the backdrop or one
 // of the buttons, and close or fire the pill before it has been read
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

 // How many buttons this pill has: six always, and two that depend.
 const buttons = 6 + (state.hasWordHighlights ? 1 : 0) + (state.hasCrossRefs ? 1 : 0);
 // Four buttons, three gaps, the pill's padding and its border: 4 x 44 +
 // 3 x 6 + 16 + 2. Past six buttons this is as wide as the pill may be, so
 // the rows come out even.
 const twoRows = buttons > 6;

 const ringIfActive = (active: boolean) =>
 active
 ? "bg-gold/25 border-gold/60 text-gold"
 : "border-paper/15 bg-night/95 text-paper/80 active:bg-paper/10";

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
 {/* Floating pill at the bottom-center of the viewport, lifted above
 the mobile tab bar + iOS home indicator. Same math as
 MobileChapterPill so the two pills stack predictably when both
 are visible. */}
 <div
 className="absolute inset-x-0 px-4 flex flex-col items-center gap-2 pointer-events-none"
 style={{
 bottom:
 "calc(var(--tab-bar-h) + var(--now-playing-h) + env(safe-area-inset-bottom, 0px) + 12px)",
 }}
 >
 {palette && palette.length > 0 && onColor && (
 <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-paper/15 bg-night/95 backdrop-blur px-3 py-2 shadow-[0_12px_32px_rgba(0,0,0,0.55)]">
 {palette.map((c) => (
 <button
 key={c.id}
 type="button"
 onClick={() => {
 if (lift.isLift()) return;
 onColor(c.id);
 onClose();
 }}
 aria-label={t("bible.highlightColorNamed", { label: c.label })}
 aria-pressed={activeColor === c.id}
 className={
 "h-7 w-7 rounded-full border-2 transition-transform active:scale-95 " +
 (activeColor === c.id ? "border-paper/80" : "border-transparent")
 }
 style={{ backgroundColor: c.swatch }}
 />
 ))}
 </div>
 )}
 <div
 className={
 "pointer-events-auto inline-flex items-center justify-center gap-1.5 rounded-[30px] border border-paper/15 bg-night/95 backdrop-blur px-2 py-2 shadow-[0_12px_32px_rgba(0,0,0,0.55)] " +
 (twoRows ? "max-w-[212px] flex-wrap" : "max-w-full")
 }
 >
 <button
 type="button"
 onClick={() => handle("highlight")}
 aria-label={state.highlighted ? t("bible.removeHighlight") : t(itemKeys.highlight)}
 aria-pressed={state.highlighted}
 className={
 "h-11 w-11 rounded-full border flex items-center justify-center text-body transition-colors duration-150 " +
 ringIfActive(state.highlighted)
 }
 >
 <Sparkle size={18} filled={state.highlighted} />
 </button>
 {state.hasWordHighlights && (
 <button
 type="button"
 onClick={() => handle("clearWords")}
 aria-label={t("bible.clearWordHighlights")}
 className={
 "h-11 w-11 rounded-full border flex items-center justify-center text-body transition-colors duration-150 " +
 ringIfActive(false)
 }
 >
 <Erase size={18} />
 </button>
 )}
 <button
 type="button"
 onClick={() => handle("copyText")}
 aria-label={t(itemKeys.copyText)}
 className={
 "h-11 w-11 rounded-full border flex items-center justify-center text-body transition-colors duration-150 " +
 ringIfActive(false)
 }
 >
 <Copy size={18} />
 </button>
 <button
 type="button"
 onClick={() => handle("copyLink")}
 aria-label={state.copied ? t("common.linkCopied") : t(itemKeys.copyLink)}
 className={
 "h-11 w-11 rounded-full border flex items-center justify-center text-body transition-colors duration-150 " +
 (state.copied
 ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
 : "border-paper/15 bg-night/95 text-paper/80 active:bg-paper/10")
 }
 >
 {state.copied ? (
 <Check size={18} />
 ) : (
 <LinkChain size={18} />
 )}
 </button>
 <button
 type="button"
 onClick={() => handle("bookmark")}
 aria-label={state.bookmarked ? t("study.saved.removeBookmark") : t(bookmarkKey)}
 aria-pressed={state.bookmarked}
 className={
 "h-11 w-11 rounded-full border flex items-center justify-center text-body transition-colors duration-150 " +
 ringIfActive(state.bookmarked)
 }
 >
 <Star size={18} filled={state.bookmarked} />
 </button>
 <button
 type="button"
 onClick={() => handle("note")}
 aria-label={state.hasNote ? t("bible.editNote") : t("bible.addNote")}
 aria-pressed={state.hasNote}
 className={
 "h-11 w-11 rounded-full border flex items-center justify-center text-body transition-colors duration-150 " +
 (state.hasNote
 ? "bg-paper/15 border-paper/30 text-paper"
 : "border-paper/15 bg-night/95 text-paper/80 active:bg-paper/10")
 }
 >
 <Pen size={18} />
 </button>
 {state.hasCrossRefs ? (
 <button
 type="button"
 onClick={() => handle("crossRefs")}
 aria-label={t("bible.crossRefs")}
 className="h-11 w-11 rounded-full border border-paper/15 bg-night/95 text-paper/80 active:bg-paper/10 flex items-center justify-center text-body transition-colors duration-150"
 >
 <CrossRefs size={18} />
 </button>
 ) : null}
 <button
 type="button"
 onClick={() => handle("gather")}
 aria-label={t("bible.gatherToFlorilegium")}
 className="h-11 w-11 rounded-full border border-paper/15 bg-night/95 text-paper/80 active:bg-paper/10 flex items-center justify-center text-body transition-colors duration-150"
 >
 <Flower size={18} />
 </button>
 </div>
 </div>
 </div>
 );
}
