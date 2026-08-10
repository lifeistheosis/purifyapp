"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search } from "@/components/ui/icons/Search";
import { SAINTS } from "@/lib/saints/saints";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * Instant search for the Saints section. As you type, a dropdown surfaces
 * matching saints or their works; selecting one navigates to that saint
 * (/saints/{slug}) or work (/saints/{slug}/{workSlug}). Mirrors the Bible
 * search component (components/bible/BibleSearch.tsx).
 */

type Hit = {
 type: "saint" | "work";
 label: string;
 sub: string;
 href: string;
 haystack: string;
};

// Built once at module scope, SAINTS is a static array.
const INDEX: Hit[] = (() => {
 const hits: Hit[] = [];
 for (const s of SAINTS) {
 hits.push({
 type: "saint",
 label: s.name,
 sub: s.epithet || s.byname || "",
 href: `/saints/${s.slug}`,
 haystack: [s.name, s.byname, s.epithet, s.shortBio]
 .filter(Boolean)
 .join(" ")
 .toLowerCase(),
 });
 for (const w of s.works) {
 hits.push({
 type: "work",
 label: w.title,
 sub: w.subtitle ? `${s.name} · ${w.subtitle}` : s.name,
 href: `/saints/${s.slug}/${w.slug}`,
 haystack: [w.title, w.subtitle, w.blurb, ...(w.topics ?? []), s.name]
 .filter(Boolean)
 .join(" ")
 .toLowerCase(),
 });
 }
 }
 return hits;
})();

function search(q: string, limit = 8): Hit[] {
 const term = q.trim().toLowerCase();
 if (!term) return [];
 const scored: { hit: Hit; score: number }[] = [];
 for (const hit of INDEX) {
 if (!hit.haystack.includes(term)) continue;
 // Rank: label starts with term > label contains term > body match only.
 const label = hit.label.toLowerCase();
 let score = 0;
 if (label.startsWith(term)) score = 3;
 else if (label.includes(term)) score = 2;
 else score = 1;
 // Prefer saints over works on ties.
 if (hit.type === "saint") score += 0.5;
 scored.push({ hit, score });
 }
 scored.sort((a, b) => b.score - a.score);
 return scored.slice(0, limit).map((s) => s.hit);
}

export function SaintSearch({ className }: { className?: string }) {
  const { t } = useTranslate();
 const router = useRouter();
 const [q, setQ] = useState("");
 const [open, setOpen] = useState(false);
 const [activeIdx, setActiveIdx] = useState(0);
 const containerRef = useRef<HTMLDivElement>(null);

 const hits = useMemo(() => search(q, 8), [q]);

 useEffect(() => {
 function onDocClick(e: MouseEvent) {
 if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
 }
 document.addEventListener("mousedown", onDocClick);
 return () => document.removeEventListener("mousedown", onDocClick);
 }, []);

 function commit(h: Hit | undefined) {
 if (!h) return;
 setOpen(false);
 setQ("");
 router.push(h.href);
 }

 function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
 if (e.key === "ArrowDown") {
 e.preventDefault();
 setActiveIdx((i) => Math.min(hits.length - 1, i + 1));
 } else if (e.key === "ArrowUp") {
 e.preventDefault();
 setActiveIdx((i) => Math.max(0, i - 1));
 } else if (e.key === "Enter") {
 e.preventDefault();
 commit(hits[activeIdx]);
 } else if (e.key === "Escape") {
 setOpen(false);
 }
 }

 const showDropdown = open && q.trim().length > 0;

 return (
 // `z-20` is belt and braces. The base `.cascade` rule no longer leaves this
 // wrapper a permanent stacking context, but it is one for the length of the
 // entrance animation, and the block that follows on /saints is full of saint
 // icons. An explicit z-index sorts this above them whatever the parent does.
 <div ref={containerRef} className={`relative z-20 ${className ?? ""}`}>
 <div className="relative">
 <Search
 aria-hidden
 className="absolute left-4 top-1/2 -translate-y-1/2 text-paper/40 h-4 w-4"
 />
 <input
 type="search"
 value={q}
 onChange={(e) => {
 setQ(e.target.value);
 setActiveIdx(0);
 }}
 onFocus={() => setOpen(true)}
 onKeyDown={onKey}
 placeholder={t("saints.searchPlaceholder")}
 aria-label={t("saints.searchPlaceholder")}
 className="w-full bg-paper/[0.04] border border-paper/15 rounded-pill pl-10 pr-4 py-3 font-sans text-ui text-paper placeholder:text-paper/40 focus:outline-none focus:border-paper/40 transition-colors duration-150"
 />
 </div>

 {showDropdown && (
 // Capped and scrollable: eight hits at full height run past the bottom of a
 // phone and under the fixed tab bar, so the last results were unreachable.
 <div className="absolute z-50 mt-2 left-0 right-0 rounded-md border border-paper/15 bg-night shadow-lg max-h-[min(60vh,26rem)] overflow-y-auto overscroll-contain scrollbar-thin">
 {hits.length === 0 ? (
 <p className="px-4 py-3 font-sans text-ui text-paper/55">
 {t("bible.noMatches")}
 </p>
 ) : (
 <ul role="listbox">
 {hits.map((h, i) => (
 <li key={h.href} role="option" aria-selected={i === activeIdx}>
 <Link
 href={h.href}
 onMouseEnter={() => setActiveIdx(i)}
 onClick={() => {
 setOpen(false);
 setQ("");
 }}
 className={
 "flex items-center gap-3 px-4 py-3 font-sans text-ui " +
 (i === activeIdx
 ? "bg-paper/10 text-paper"
 : "text-paper/85 hover:bg-paper/5")
 }
 >
 <span className="min-w-0 flex-1">
 <span className="font-medium block truncate">
 {h.label}
 </span>
 {h.sub && (
 <span className="block text-caption text-paper/45 mt-0.5 truncate">
 {h.sub}
 </span>
 )}
 </span>
 <span className="shrink-0 rounded-pill border border-paper/15 px-2 py-0.5 text-eyebrow font-semibold uppercase tracking-[1px] text-paper/55">
 {h.type === "saint" ? "Saint" : "Work"}
 </span>
 </Link>
 </li>
 ))}
 </ul>
 )}
 </div>
 )}
 </div>
 );
}
