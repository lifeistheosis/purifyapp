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
 const ecumenical = COUNCILS.filter((c) => c.kind !== "local");
 const local = COUNCILS.filter((c) => c.kind === "local");
 return (
 <section className="bg-night px-5 md:px-8 py-16 md:py-24">
 <div className="mx-auto max-w-[1200px] w-full">
 <p className="font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/60 mb-4">
 {t(m, "councils.eyebrow")}
 </p>
 <h1 className="font-sans text-display-sm md:text-display-lg font-bold text-paper tracking-[-0.025em] leading-[1.05]">
 {t(m, "councils.h1")}
 </h1>
 <p className="mt-5 max-w-[720px] font-serif text-lede md:text-lede text-paper/80 leading-[1.65]">
 The seven councils of the whole Church, between Nicaea in 325 and
 the Second Council of Nicaea in 787, received by the Eastern
 Orthodox Church as authoritative for the whole Faith. Each profile
 carries the historical context, the Holy Fathers principally
 associated with the council, the principal opposing parties, and
 the dogmatic Definition and Canons in full from the public-domain
 Schaff &amp; Wace edition.
 </p>

 <p className="mt-3 max-w-[720px] font-sans text-detail text-paper/55 leading-[1.6]">
 Posture: where the Fathers spoke with one voice, we serve their
 text. Where later traditions differ on the reception of a council
 (notably Chalcedon and the Oriental Orthodox separation), we name
 the difference and surface the standard EO position without
 entering modern polemic. See <Link href="/about" className="underline underline-offset-2 decoration-paper/30 hover:decoration-paper">/about</Link> for the doctrinal stance in full.
 </p>

 <ul className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-5">
 {ecumenical.map((c) => (
 <li key={c.slug}>
 <Link
 href={`/councils/${c.slug}`}
 className="group block h-full rounded-md border border-paper/12 bg-paper/[0.03] hover:border-gold/45 hover:bg-gold/[0.04] transition-colors px-6 py-6"
 >
 <p className="font-sans text-eyebrow uppercase tracking-[1.5px] text-gold/75 font-semibold">
 {ORDINAL_NAMES[c.ordinal ?? 0]} Ecumenical Council
 </p>
 <h2 className="mt-2 font-display-serif text-title-sm md:text-title-sm text-paper leading-tight">
 {c.byname}
 </h2>
 <p className="mt-1 font-sans text-caption text-paper/55">
 {c.year} &middot; {c.location}
 </p>
 <p className="mt-3 font-serif text-ui text-paper/80 leading-[1.6]">
 {c.shortBio}
 </p>
 </Link>
 </li>
 ))}
 </ul>

 {ecumenical.length < 7 && (
 <p className="mt-10 font-sans text-detail text-paper/55 italic">
 More councils are landing soon. The seven Ecumenical Councils
 will be completed in the next content releases.
 </p>
 )}

 {local.length > 0 && (
 <div className="mt-20">
 <h2 className="font-sans text-display-sm md:text-display-sm font-bold text-paper tracking-[-0.02em] leading-tight">
 Local and Regional Councils
 </h2>
 <p className="mt-4 max-w-[720px] font-serif text-ui md:text-lede text-paper/80 leading-[1.65]">
 Beyond the seven, the early Church met in many local and
 regional synods. These did not bind the whole Church as the
 Ecumenical Councils do, but the Church received their witness,
 and several stood guard over the Faith before Nicaea. Their
 profiles are historical; verbatim canons are added as
 public-domain texts are prepared.
 </p>
 <ul className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-5">
 {local.map((c) => (
 <li key={c.slug}>
 <Link
 href={`/councils/${c.slug}`}
 className="group block h-full rounded-md border border-paper/12 bg-paper/[0.03] hover:border-gold/45 hover:bg-gold/[0.04] transition-colors px-6 py-6"
 >
 <p className="font-sans text-eyebrow uppercase tracking-[1.5px] text-gold/75 font-semibold">
 Local Council &middot; {c.year}
 </p>
 <h2 className="mt-2 font-display-serif text-title-sm md:text-title-sm text-paper leading-tight">
 {c.byname}
 </h2>
 <p className="mt-1 font-sans text-caption text-paper/55">
 {c.location}
 </p>
 <p className="mt-3 font-serif text-ui text-paper/80 leading-[1.6]">
 {c.shortBio}
 </p>
 </Link>
 </li>
 ))}
 </ul>
 </div>
 )}
 </div>
 </section>
 );
}
