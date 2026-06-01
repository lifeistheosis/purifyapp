"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";
import { getBook } from "@/lib/bible/books";

type Translation = {
 id: string;
 shortLabel: string;
 fullLabel: string;
 testament: "OT" | "NT" | "BOTH";
 available: boolean;
 /** Licensed (API.Bible) translation, selected via ?v= and fetched live. */
 licensed?: boolean;
 note?: string;
};

// Single canonical list of translations the app cares about.
// New translations get added here once their text is licensed/ingested.
const TRANSLATIONS: Translation[] = [
 {
 id: "lxx-brenton",
 shortLabel: "Brenton LXX",
 fullLabel: "Brenton's English Septuagint (1851)",
 testament: "OT",
 available: true,
 note: "Public domain. The Greek Old Testament used by the Apostles.",
 },
 {
 id: "kjv",
 shortLabel: "KJV",
 fullLabel: "King James Version (1611)",
 testament: "NT",
 available: true,
 note: "Public domain.",
 },
 {
 id: "web",
 shortLabel: "WEB",
 fullLabel: "World English Bible",
 testament: "BOTH",
 available: false,
 note: "Public domain modern English. Coming soon.",
 },
 {
 id: "nkjv",
 shortLabel: "NKJV",
 fullLabel: "New King James Version",
 testament: "NT",
 available: true,
 licensed: true,
 note: "© Thomas Nelson. Used by permission.",
 },
 {
 id: "niv",
 shortLabel: "NIV",
 fullLabel: "New International Version",
 testament: "NT",
 available: true,
 licensed: true,
 note: "© Biblica. Used by permission.",
 },
 {
 id: "nlt",
 shortLabel: "NLT",
 fullLabel: "New Living Translation",
 testament: "NT",
 available: true,
 licensed: true,
 note: "© Tyndale House. Used by permission.",
 },
];

// The public-domain default for a testament (used when no licensed ?v= is set).
function pdDefaultForTestament(testament: "OT" | "NT"): Translation {
 return (
 TRANSLATIONS.find(
 (t) =>
 t.available &&
 !t.licensed &&
 (t.testament === testament || t.testament === "BOTH"),
 ) ?? TRANSLATIONS[0]
 );
}

export function TranslationSwitcher({
 currentSlug,
 configuredLicensed = [],
}: {
 currentSlug: string;
 /** Licensed translation ids that are actually configured (key + bibleId).
 * Others are shown but disabled so selecting them can't silently fall back. */
 configuredLicensed?: string[];
}) {
 const book = getBook(currentSlug);
 const testament = (book?.testament ?? "OT") as "OT" | "NT";

 // A licensed row is selectable only when its API access is configured.
 const isSelectable = (t: Translation) =>
 t.available && (!t.licensed || configuredLicensed.includes(t.id));

 const router = useRouter();
 const pathname = usePathname();
 const searchParams = useSearchParams();
 const activeV = searchParams.get("v");

 // A licensed translation is "current" only when its ?v= is set AND it applies
 // to this testament (licensed translations are NT here). Otherwise the
 // public-domain default for the testament is current.
 const licensedActive = TRANSLATIONS.find(
 (t) => t.licensed && t.id === activeV && t.testament === testament,
 );
 const current = licensedActive ?? pdDefaultForTestament(testament);

 function select(t: Translation) {
 if (!isSelectable(t) || t.id === current.id) {
 setOpen(false);
 return;
 }
 const params = new URLSearchParams(searchParams.toString());
 if (t.licensed) params.set("v", t.id);
 else params.delete("v");
 const qs = params.toString();
 router.push(qs ? `${pathname}?${qs}` : pathname);
 setOpen(false);
 }

 const [open, setOpen] = useState(false);
 const rootRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
 if (!open) return;
 function onDown(e: MouseEvent) {
 if (!rootRef.current) return;
 if (!rootRef.current.contains(e.target as Node)) setOpen(false);
 }
 function onKey(e: KeyboardEvent) {
 if (e.key === "Escape") setOpen(false);
 }
 document.addEventListener("mousedown", onDown);
 document.addEventListener("keydown", onKey);
 return () => {
 document.removeEventListener("mousedown", onDown);
 document.removeEventListener("keydown", onKey);
 };
 }, [open]);

 // Show: applicable translations first (for this testament), then "both", then others.
 const visible = TRANSLATIONS.filter(
 (t) => t.testament === testament || t.testament === "BOTH",
 );

 return (
 <div ref={rootRef} className="relative inline-block">
 <button
 type="button"
 onClick={() => setOpen((v) => !v)}
 aria-haspopup="listbox"
 aria-expanded={open}
 className="inline-flex items-center gap-2 rounded-pill border border-paper/15 bg-paper/[0.04] hover:border-paper/30 hover:bg-paper/10 focus:outline-none focus:ring-2 focus:ring-paper/25 px-3 py-2 font-sans text-detail font-medium text-paper transition-colors"
 >
 <span className="font-sans text-eyebrow font-semibold uppercase tracking-[1.2px] text-paper/50">
 Translation
 </span>
 <span className="font-sans text-detail font-medium text-paper">
 {current.shortLabel}
 </span>
 <span
 aria-hidden
 className={cn(
 "text-eyebrow text-paper/55 transition-transform duration-200",
 open && "rotate-180",
 )}
 >
 ▾
 </span>
 </button>

 {open && (
 <div
 role="dialog"
 aria-label="Switch translation"
 className="absolute left-0 top-[calc(100%+8px)] z-50 w-[min(360px,calc(100vw-2rem))] rounded-lg border border-paper/15 bg-night shadow-overlay overflow-hidden"
 >
 <div className="px-4 pt-3 pb-2 border-b border-paper/10">
 <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/55">
 {testament === "OT" ? "Old Testament" : "New Testament"}
 </p>
 </div>
 <ul role="listbox" className="p-2 max-h-[60vh] overflow-y-auto">
 {visible.map((t) => {
 const isCurrent = t.id === current.id;
 const selectable = isSelectable(t);
 const needsSetup =
 t.licensed && t.available && !configuredLicensed.includes(t.id);
 return (
 <li key={t.id}>
 <div
 role="option"
 aria-selected={isCurrent}
 aria-disabled={!selectable}
 tabIndex={selectable ? 0 : -1}
 onClick={() => select(t)}
 onKeyDown={(e) => {
 if (e.key === "Enter" || e.key === " ") {
 e.preventDefault();
 select(t);
 }
 }}
 className={cn(
 "rounded-md px-3 py-2.5 transition-colors",
 isCurrent
 ? "bg-accent/12"
 : selectable
 ? "hover:bg-paper/[0.06] cursor-pointer"
 : "opacity-55",
 )}
 >
 <div className="flex items-center justify-between gap-3">
 <div className="min-w-0">
 <p className="font-sans text-detail font-medium text-paper">
 {t.fullLabel}
 </p>
 {(needsSetup || t.note) && (
 <p className="mt-0.5 font-sans text-caption text-paper/50">
 {needsSetup ? "Requires setup" : t.note}
 </p>
 )}
 </div>
 <span
 className={cn(
 "font-sans text-eyebrow uppercase tracking-[1px] shrink-0 px-2 py-0.5 rounded-full border",
 isCurrent
 ? "border-accent/40 text-accent bg-accent/8"
 : selectable
 ? "border-paper/20 text-paper/65"
 : "border-paper/10 text-paper/35",
 )}
 >
 {isCurrent
 ? "Current"
 : needsSetup
 ? "Setup"
 : selectable
 ? t.licensed
 ? "Licensed"
 : "Free"
 : "Soon"}
 </span>
 </div>
 </div>
 </li>
 );
 })}
 </ul>
 <div className="border-t border-paper/10 px-3 py-2 font-sans text-eyebrow text-paper/40">
 More translations coming as licensing lands.
 </div>
 </div>
 )}
 </div>
 );
}
