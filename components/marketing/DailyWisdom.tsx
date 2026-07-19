import Link from "next/link";
import { pickDailyWisdom } from "@/data/marketing/daily-wisdom";
import { T } from "@/components/i18n/T";

/**
 * Server component. Pulls today's daily wisdom entry, a Scripture
 * verse on even days, a Father's saying on odd days, and renders it
 * as a quiet band on the home page. ISR'd by the host page so the
 * entry refreshes once per day without a redeploy.
 */
export function DailyWisdom() {
 const { entry, useVerse } = pickDailyWisdom();
 const cite = entry.cite;
 const text = entry.text;

 return (
 <section className="bg-night-soft border-y border-white/8 px-5 md:px-8 py-10 md:py-12">
 <div className="mx-auto max-w-[820px] w-full text-center">
 <p className="font-sans text-eyebrow font-semibold uppercase tracking-[2px] text-paper/45 mb-4">
 <T k="ui.dailyWisdom" /> · {useVerse ? "Scripture" : "From the Fathers"}
 </p>
 <p className="font-serif italic text-lede md:text-title-sm text-paper/90 leading-[1.55]">
 &ldquo;{text}&rdquo;
 </p>
 {entry.href ? (
 <Link
 href={entry.href}
 className="mt-5 inline-block font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-gold/85 hover:text-gold transition-colors"
 >
 {cite} →
 </Link>
 ) : (
 <p className="mt-5 font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-gold/85">
 {cite}
 </p>
 )}
 </div>
 </section>
 );
}
