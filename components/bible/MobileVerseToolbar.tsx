"use client";

import { useEffect } from "react";
import { setOverlayOpen } from "@/lib/ui/overlay";
import { Highlighter, Eraser, Link2, Check, Bookmark, SquarePen } from "lucide-react";

export type MobileVerseAction =
 | "highlight"
 | "bookmark"
 | "copyLink"
 | "note"
 | "clearWords";

type ActionState = {
 highlighted: boolean;
 bookmarked: boolean;
 hasNote: boolean;
 hasWordHighlights: boolean;
 copied: boolean;
};

/**
 * Mobile contextual action bar for a single verse. Floats above the
 * bottom of the viewport like the iOS contextual toolbar; opens on
 * long-press, dismisses on outside-tap, Escape, or after any action.
 *
 * Only renders below the `md:` breakpoint, the per-verse hover-revealed
 * desktop toolbar in VerseRow is untouched.
 */
export function MobileVerseToolbar({
 reference,
 state,
 onAction,
 onClose,
}: {
 reference: string;
 state: ActionState;
 onAction: (a: MobileVerseAction) => void;
 onClose: () => void;
}) {
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

 // Tap-outside dismiss via a transparent backdrop. We do NOT lock body
 // scroll, the toolbar is a transient affordance, not a modal.

 function handle(a: MobileVerseAction) {
 onAction(a);
 onClose();
 }

 const ringIfActive = (active: boolean) =>
 active
 ? "bg-gold/25 border-gold/60 text-gold"
 : "border-paper/15 bg-night/95 text-paper/80 active:bg-paper/10";

 return (
 <div className="md:hidden fixed inset-0 z-[55]" role="dialog" aria-modal="false" aria-label={`Verse actions, ${reference}`}>
 {/* Transparent backdrop to capture outside taps. */}
 <button
 type="button"
 aria-label="Dismiss verse actions"
 onClick={onClose}
 className="absolute inset-0 bg-transparent"
 />
 {/* Floating pill at the bottom-center of the viewport, lifted above
 the mobile tab bar + iOS home indicator. Same math as
 MobileChapterPill so the two pills stack predictably when both
 are visible. */}
 <div
 className="absolute inset-x-0 px-4 flex justify-center pointer-events-none"
 style={{
 bottom:
 "calc(var(--tab-bar-h) + env(safe-area-inset-bottom, 0px) + 12px)",
 }}
 >
 <div
 className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-paper/15 bg-night/95 backdrop-blur px-2 py-2 shadow-[0_12px_32px_rgba(0,0,0,0.55)]"
 >
 <button
 type="button"
 onClick={() => handle("highlight")}
 aria-label={state.highlighted ? "Remove highlight" : "Highlight verse"}
 aria-pressed={state.highlighted}
 className={
 "h-11 w-11 rounded-full border flex items-center justify-center text-[16px] transition-colors duration-150 " +
 ringIfActive(state.highlighted)
 }
 >
 <Highlighter className="h-[18px] w-[18px]" aria-hidden />
 </button>
 {state.hasWordHighlights && (
 <button
 type="button"
 onClick={() => handle("clearWords")}
 aria-label="Clear word highlights"
 className={
 "h-11 w-11 rounded-full border flex items-center justify-center text-[16px] transition-colors duration-150 " +
 ringIfActive(false)
 }
 >
 <Eraser className="h-[18px] w-[18px]" aria-hidden />
 </button>
 )}
 <button
 type="button"
 onClick={() => handle("copyLink")}
 aria-label={state.copied ? "Verse link copied" : "Copy verse link"}
 className={
 "h-11 w-11 rounded-full border flex items-center justify-center text-[16px] transition-colors duration-150 " +
 (state.copied
 ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
 : "border-paper/15 bg-night/95 text-paper/80 active:bg-paper/10")
 }
 >
 {state.copied ? (
 <Check className="h-[18px] w-[18px]" aria-hidden />
 ) : (
 <Link2 className="h-[18px] w-[18px]" aria-hidden />
 )}
 </button>
 <button
 type="button"
 onClick={() => handle("bookmark")}
 aria-label={state.bookmarked ? "Remove bookmark" : "Bookmark verse"}
 aria-pressed={state.bookmarked}
 className={
 "h-11 w-11 rounded-full border flex items-center justify-center text-[16px] transition-colors duration-150 " +
 ringIfActive(state.bookmarked)
 }
 >
 <Bookmark
 className="h-[18px] w-[18px]"
 fill={state.bookmarked ? "currentColor" : "none"}
 aria-hidden
 />
 </button>
 <button
 type="button"
 onClick={() => handle("note")}
 aria-label={state.hasNote ? "Edit note" : "Add note"}
 aria-pressed={state.hasNote}
 className={
 "h-11 w-11 rounded-full border flex items-center justify-center text-[16px] transition-colors duration-150 " +
 (state.hasNote
 ? "bg-paper/15 border-paper/30 text-paper"
 : "border-paper/15 bg-night/95 text-paper/80 active:bg-paper/10")
 }
 >
 <SquarePen className="h-[18px] w-[18px]" aria-hidden />
 </button>
 </div>
 </div>
 </div>
 );
}
