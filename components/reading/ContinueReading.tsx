"use client";

import Link from "next/link";
import { useReadingHistory } from "@/lib/reading/history";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { useMounted } from "@/lib/useMounted";

/**
 * "Continue reading", the reader's most recent visits. Renders nothing until
 * mounted (avoids an SSR/hydration flash) and nothing when history is empty.
 */
export function ContinueReading() {
 const { t } = useTranslate();
 const history = useReadingHistory();
 const mounted = useMounted();

 if (!mounted || history.length === 0) return null;

 const recent = history.slice(0, 4);

 return (
 <section className="mt-12 md:mt-16">
 <h2 className="font-sans text-caption font-semibold uppercase tracking-[1.6px] text-gold/85 mb-5">
 {t("reading.continue")}
 </h2>
 <ul className="divide-y divide-gold/20 border-y border-gold/20">
 {recent.map((e) => (
 <li key={e.href}>
 <Link
 href={e.href}
 className="group flex items-center gap-5 py-5 px-1 hover:bg-gold/[0.04] transition-colors"
 >
 <div className="min-w-0 flex-1">
 <p className="font-serif text-lede md:text-title-sm text-paper leading-tight group-hover:text-gold transition-colors truncate">
 {e.label}
 </p>
 </div>
 <span
 aria-hidden
 className="shrink-0 font-serif text-lede text-paper/30 group-hover:text-gold transition-colors"
 >
 →
 </span>
 </Link>
 </li>
 ))}
 </ul>
 </section>
 );
}
