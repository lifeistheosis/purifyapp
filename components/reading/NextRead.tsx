"use client";

import Link from "next/link";
import { useReadingHistory } from "@/lib/reading/history";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useMounted } from "@/lib/useMounted";
import type { NextSuggestion, ReadingPath } from "@/lib/reading/curated";

type Card = { lead?: string } & NextSuggestion;

/**
 * "Your Next Read", guided continuations. Before any history exists (and during
 * SSR/pre-mount) it shows the curated default trio; once the reader has a
 * history, it matches recent visits against editorial paths and suggests where
 * to go next, falling back to the default when nothing matches.
 *
 * Curated data arrives as serializable props from the server page; history is
 * read client-side.
 */
export function NextRead({
 paths,
 fallback,
}: {
 paths: ReadingPath[];
 fallback: NextSuggestion[];
}) {
 const { t } = useTranslate();
 const history = useReadingHistory();
 const mounted = useMounted();

 let cards: Card[] = fallback.map((s) => ({ ...s }));

 if (mounted && history.length > 0) {
 const seen = new Set(history.map((e) => e.href));
 const picked: Card[] = [];
 const usedTargets = new Set<string>();
 for (const entry of history) {
 for (const path of paths) {
 const matches =
 (path.saintSlug && entry.saintSlug === path.saintSlug) ||
 (path.href && entry.href === path.href) ||
 (path.topic &&
 entry.topics?.some(
 (tt) => tt.toLowerCase() === path.topic!.toLowerCase(),
 ));
 if (!matches) continue;
 if (seen.has(path.to.href)) continue; // already read it
 if (usedTargets.has(path.to.href)) continue; // already suggested
 usedTargets.add(path.to.href);
 picked.push({ lead: path.lead, ...path.to });
 }
 if (picked.length >= 3) break;
 }
 if (picked.length > 0) cards = picked.slice(0, 3);
 }

 return (
 <section className="mt-12 md:mt-16">
 <h2 className="font-sans text-caption font-semibold uppercase tracking-[1.6px] text-gold/85 mb-5">
 {t("reading.nextRead")}
 </h2>
 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
 {cards.map((c) => (
 <Link
 key={c.href}
 href={c.href}
 className="group rounded-card border border-gold/20 bg-paper/[0.02] p-5 hover:bg-gold/[0.04] hover:border-gold/40 transition-colors"
 >
 {c.lead && (
 <p className="font-sans text-caption uppercase tracking-[1.4px] text-gold/70 mb-2">
 {c.lead}
 </p>
 )}
 <p className="font-serif text-lede text-paper leading-tight group-hover:text-gold transition-colors">
 {c.title}
 </p>
 <p className="mt-1.5 font-serif italic text-detail text-paper/65 leading-[1.55]">
 {c.byline}
 </p>
 </Link>
 ))}
 </div>
 </section>
 );
}
