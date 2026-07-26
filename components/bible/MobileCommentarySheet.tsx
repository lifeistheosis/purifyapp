"use client";

import { Close } from "@/components/ui/icons/Close";

import { useEffect, useState } from "react";
import type { ChapterCommentary } from "@/lib/bible/load";
import { SaintIcon } from "./SaintIcon";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { lockBodyScroll, setOverlayOpen, unlockBodyScroll } from "@/lib/ui/overlay";

type Note = { author: string; work: string; text: string };

/** Group a verse's notes by author, preserving first-appearance order. */
function groupByAuthor(notes: Note[]): { author: string; items: Note[] }[] {
 const order: string[] = [];
 const map = new Map<string, Note[]>();
 for (const n of notes) {
 const arr = map.get(n.author);
 if (arr) arr.push(n);
 else {
 map.set(n.author, [n]);
 order.push(n.author);
 }
 }
 return order.map((author) => ({ author, items: map.get(author)! }));
}

/** Render the paragraphs of one commentary's text. */
function NoteText({ text }: { text: string }) {
 return (
 <div className="space-y-2.5">
 {text.split(/\n\n+/).map((para, j) => (
 <p
 key={j}
 className="font-serif text-ui leading-[1.6] text-paper/85"
 >
 {para}
 </p>
 ))}
 </div>
 );
}

/** A single Father with one commentary, shown expanded, as before. */
function SingleNote({ author, work, text }: Note) {
 return (
 <article className="rounded-md border border-paper/10 bg-paper/[0.03] p-3">
 <div className="flex items-center gap-2 mb-2">
 <SaintIcon author={author} size="sm" />
 <div className="min-w-0 flex-1 leading-tight">
 <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1px] text-paper/75 truncate">
 {author}
 </p>
 <p className="font-sans text-eyebrow italic text-paper/55 truncate">
 {work}
 </p>
 </div>
 </div>
 <NoteText text={text} />
 </article>
 );
}

/** One distinct commentary as its own collapsible card, titled by its work.
 * Used inside a FatherGroup so each commentary stays separate. */
function WorkCard({ work, text }: { work: string; text: string }) {
 const [open, setOpen] = useState(false);
 return (
 <div className="rounded-md border border-paper/10 bg-paper/[0.03] overflow-hidden">
 <button
 type="button"
 onClick={() => setOpen((v) => !v)}
 aria-expanded={open}
 className="w-full flex items-center gap-2 p-3 text-left hover:bg-paper/[0.05] transition-colors"
 >
 <p className="min-w-0 flex-1 font-sans text-eyebrow italic text-paper/60 truncate">
 {work}
 </p>
 <span
 aria-hidden
 className={
 "text-caption text-paper/40 transition-transform duration-200 " +
 (open ? "rotate-180" : "")
 }
 >
 ▾
 </span>
 </button>
 {open && (
 <div className="px-3 pb-3 pt-1 border-t border-paper/8">
 <NoteText text={text} />
 </div>
 )}
 </div>
 );
}

/** A Father with multiple commentaries on one verse. The Father is a plain
 * category label; each distinct commentary stays its own collapsible card
 * (titled by its work) beneath it. Nothing is merged. */
function FatherGroup({ author, items }: { author: string; items: Note[] }) {
  const { tn } = useTranslate();
 return (
 <div>
 <div className="flex items-center gap-2 mb-2 px-0.5">
 <SaintIcon author={author} size="sm" />
 <div className="min-w-0 flex-1 leading-tight">
 <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1px] text-paper/75 truncate">
 {author}
 </p>
 <p className="font-sans text-eyebrow italic text-paper/55 truncate">
 {tn("bible.commentariesCount", items.length)}
 </p>
 </div>
 </div>
 <div className="pl-2 ml-2 border-l border-paper/10 space-y-2">
 {items.map((it, i) => (
 <WorkCard key={i} work={it.work} text={it.text} />
 ))}
 </div>
 </div>
 );
}

/**
 * Mobile-only bottom sheet that shows patristic commentary for a single
 * verse. Replaces the collapsed `<details>` block that used to live at
 * the foot of the chapter on mobile. Desktop continues to use the
 * sticky right-rail (StudyRail) untouched.
 *
 * The sheet is keyed on `verse`; when `verse` is null, the sheet is
 * closed. We delay unmounting one tick so the slide-down animation can
 * play.
 */
export function MobileCommentarySheet({
 bookName,
 chapter,
 verse,
 commentary,
 onClose,
}: {
 bookName: string;
 chapter: number;
 verse: number | null;
 commentary: ChapterCommentary;
 onClose: () => void;
}) {
  const { t } = useTranslate();
 // Track whether the sheet is mounted (so we can run the close animation
 // before unmount) and whether it's visually "shown" (so we can play the
 // slide-in animation on first paint).
 const [mounted, setMounted] = useState(false);
 const [shown, setShown] = useState(false);

 // Drive the mount-with-animation phases off the `verse` prop. The
 // setStates here are unavoidable: the slide-in/out timing isn't React
 // state, it's coupled to the DOM. Pattern matches other delayed-unmount
 // animations elsewhere in the codebase.
 /* eslint-disable react-hooks/set-state-in-effect */
 useEffect(() => {
 if (verse !== null) {
 setMounted(true);
 const id = requestAnimationFrame(() => setShown(true));
 return () => cancelAnimationFrame(id);
 } else {
 setShown(false);
 const t = setTimeout(() => setMounted(false), 220);
 return () => clearTimeout(t);
 }
 }, [verse]);
 /* eslint-enable react-hooks/set-state-in-effect */

 // Lock body scroll while open + flag the global overlay so other
 // floating UI (the PWA install banner) can step aside.
 useEffect(() => {
 if (!mounted) return;
 lockBodyScroll();
 setOverlayOpen(true);
 return () => {
 unlockBodyScroll();
 setOverlayOpen(false);
 };
 }, [mounted]);

 // Close on Escape.
 useEffect(() => {
 if (!mounted) return;
 function onKey(e: KeyboardEvent) {
 if (e.key === "Escape") onClose();
 }
 window.addEventListener("keydown", onKey);
 return () => window.removeEventListener("keydown", onKey);
 }, [mounted, onClose]);

 if (!mounted) return null;

 const notes = verse !== null ? commentary[String(verse)] ?? [] : [];

 return (
 <div className="lg:hidden fixed inset-0 z-[60]" role="dialog" aria-modal="true">
 {/* Backdrop */}
 <button
 type="button"
 aria-label={t("bible.closeCommentary")}
 onClick={onClose}
 className={
 "absolute inset-0 bg-night/70 backdrop-blur-sm transition-opacity duration-200 " +
 (shown ? "opacity-100" : "opacity-0")
 }
 />
 {/* Sheet */}
 <div
 className={
 "absolute inset-x-0 bottom-0 max-h-[85dvh] flex flex-col rounded-t-3xl border-t border-paper/15 bg-night shadow-[0_-12px_40px_rgba(0,0,0,0.5)] transition-transform duration-200 ease-out " +
 (shown ? "translate-y-0" : "translate-y-full")
 }
 >
 {/* Grab handle */}
 <div className="flex justify-center pt-2.5 pb-1">
 <span
 aria-hidden
 className="block h-1 w-10 rounded-full bg-paper/25"
 />
 </div>

 {/* Header */}
 <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b border-paper/10">
 <div className="min-w-0">
 <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/55">
 {t("bible.patristicCommentary")}
 </p>
 <p className="mt-0.5 font-serif text-body text-paper truncate">
 {bookName} {chapter}:{verse}
 {notes.length > 0 && (
 <span className="ml-2 align-middle rounded-full bg-paper/10 px-1.5 py-0.5 font-sans text-eyebrow font-semibold tabular-nums text-paper/55">
 {notes.length}
 </span>
 )}
 </p>
 </div>
 <button
 type="button"
 onClick={onClose}
 aria-label={t("common.close")}
 className="shrink-0 h-11 w-11 rounded-full flex items-center justify-center text-paper/65 hover:text-paper hover:bg-paper/[0.06] transition-colors"
 >
 <Close size={16} />
 </button>
 </div>

 {/* Scroll body. The extra bottom padding is not decoration: the sheet
 is pinned to bottom-0 and sits above the tab bar (z-60 over z-50),
 so without it the last line of a Father lands under the home
 indicator and is hard to read. Reported from the Android beta,
 2026-07-14. */}
 <div
 className="flex-1 overflow-y-auto overscroll-contain px-5 pt-4 space-y-3"
 style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 2rem)" }}
 >
 {notes.length === 0 ? (
 <p className="font-sans text-detail text-paper/55 text-center py-10">
 {t("bible.noCommentaryVerse")}
 </p>
 ) : (
 groupByAuthor(notes).map((g, i) =>
 g.items.length === 1 ? (
 <SingleNote
 key={i}
 author={g.author}
 work={g.items[0].work}
 text={g.items[0].text}
 />
 ) : (
 <FatherGroup key={i} author={g.author} items={g.items} />
 ),
 )
 )}
 </div>
 </div>
 </div>
 );
}
