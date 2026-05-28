import Link from "next/link";
import { COUNCILS } from "@/lib/councils/councils";
import { getServerLocale } from "@/lib/i18n/server";
import { getMessages, t } from "@/lib/i18n";

export const metadata = {
 title: "The Ecumenical Councils",
 description:
 "The seven Ecumenical Councils of the Orthodox Church, with their Definitions, Canons, and historical context.",
};

const ORDINAL_NAMES = [
 "",
 "First",
 "Second",
 "Third",
 "Fourth",
 "Fifth",
 "Sixth",
 "Seventh",
];

export default async function CouncilsPage() {
 const locale = await getServerLocale();
 const m = getMessages(locale);
 return (
 <section className="bg-night px-5 md:px-8 py-16 md:py-24">
 <div className="mx-auto max-w-[1200px] w-full">
 <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/60 mb-4">
 {t(m, "councils.eyebrow")}
 </p>
 <h1 className="font-sans text-[40px] md:text-[56px] font-bold text-paper tracking-[-0.025em] leading-[1.05]">
 {t(m, "councils.h1")}
 </h1>
 <p className="mt-5 max-w-[720px] font-serif text-[18px] md:text-[19px] text-paper/80 leading-[1.65]">
 The seven councils of the whole Church, between Nicaea in 325 and
 the Second Council of Nicaea in 787, received by the Eastern
 Orthodox Church as authoritative for the whole Faith. Each profile
 carries the historical context, the Holy Fathers principally
 associated with the council, the principal opposing parties, and
 the dogmatic Definition and Canons in full from the public-domain
 Schaff &amp; Wace edition.
 </p>

 <p className="mt-3 max-w-[720px] font-sans text-[13.5px] text-paper/55 leading-[1.6]">
 Posture: where the Fathers spoke with one voice, we serve their
 text. Where later traditions differ on the reception of a council
 (notably Chalcedon and the Oriental Orthodox separation), we name
 the difference and surface the standard EO position without
 entering modern polemic. See <Link href="/about" className="underline underline-offset-2 decoration-paper/30 hover:decoration-paper">/about</Link> for the doctrinal stance in full.
 </p>

 <ul className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-5">
 {COUNCILS.map((c) => (
 <li key={c.slug}>
 <Link
 href={`/councils/${c.slug}`}
 className="group block h-full rounded-md border border-paper/12 bg-paper/[0.03] hover:border-gold/45 hover:bg-gold/[0.04] transition-colors px-6 py-6"
 >
 <p className="font-sans text-[11px] uppercase tracking-[1.5px] text-gold/75 font-semibold">
 {ORDINAL_NAMES[c.ordinal]} Ecumenical Council
 </p>
 <h2 className="mt-2 font-display-serif text-[22px] md:text-[24px] text-paper leading-tight">
 {c.byname}
 </h2>
 <p className="mt-1 font-sans text-[12.5px] text-paper/55">
 {c.year} &middot; {c.location}
 </p>
 <p className="mt-3 font-serif text-[15px] text-paper/80 leading-[1.6]">
 {c.shortBio}
 </p>
 </Link>
 </li>
 ))}
 </ul>

 {COUNCILS.length < 7 && (
 <p className="mt-10 font-sans text-[13px] text-paper/55 italic">
 More councils are landing soon. The seven Ecumenical Councils
 will be completed in the next content releases.
 </p>
 )}
 </div>
 </section>
 );
}
