import Link from "next/link";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { ReadingMobile } from "@/components/mobile/ReadingMobile";
import { OrnamentHeadpiece } from "@/components/calendar/OrnamentHeadpiece";
import { ContinueReading } from "@/components/reading/ContinueReading";
import { NextRead } from "@/components/reading/NextRead";
import { HaloedHead } from "@/components/ui/icons/HaloedHead";
import { Church } from "@/components/ui/icons/Church";
import { Book } from "@/components/ui/icons/Book";
import { Quill } from "@/components/ui/icons/Quill";
import { Codex } from "@/components/ui/icons/Codex";
import { POPULAR, PATHS, DEFAULT_NEXT } from "@/lib/reading/curated";
import { collections } from "@/lib/reading/surfaces";
import { loadAllTopics } from "@/lib/topics/topics";
import { getServerLocale } from "@/lib/i18n/server";
import { getMessages, t } from "@/lib/i18n";
import { T } from "@/components/i18n/T";

export const metadata = {
 title: "Reading",
 description:
 "A reading room for the Fathers: continue where you left off, popular reads, and where to read next.",
};

export const revalidate = 3600;

type Row = { label: string; href: string; blurb: string; Icon: typeof Codex };

export default async function ReadingPage() {
 const locale = await getServerLocale();
 const m = getMessages(locale);
 const topics = await loadAllTopics();
 const hasCollections = collections().length > 0;

 // Reading surfaces, the rooms of the library.
 const ROWS: Row[] = [
 {
 label: t(m, "reading.surface.patristic"),
 href: "/saints",
 blurb: t(m, "reading.surface.patristicBlurb"),
 Icon: Quill,
 },
 {
 label: t(m, "reading.surface.saints"),
 href: "/saints",
 blurb: t(m, "reading.surface.saintsBlurb"),
 Icon: HaloedHead,
 },
 {
 label: t(m, "reading.surface.councils"),
 href: "/councils",
 blurb: t(m, "reading.surface.councilsBlurb"),
 Icon: Church,
 },
 {
 label: t(m, "reading.surface.topics"),
 href: "/topics",
 blurb: t(m, "reading.surface.topicsBlurb"),
 Icon: Book,
 },
 ];
 if (hasCollections) {
 ROWS.push({
 label: t(m, "reading.surface.collections"),
 href: "/saints/gregory-palamas/essence-and-energies",
 blurb: t(m, "reading.surface.collectionsBlurb"),
 Icon: Codex,
 });
 }

 return (
 <>
 <ReadingMobile popular={POPULAR} paths={PATHS} fallback={DEFAULT_NEXT} />
 <div className="hidden md:contents">
 <MobileTopBar title={t(m, "reading.h1").replace(/\.$/, "")} />
 <section className="bg-night min-h-[calc(100dvh-72px)] md:px-8 md:py-16">
 <article className="mx-auto max-w-[820px] w-full px-5 pt-6 pb-10 md:pt-0 md:pb-0">
 <header className="text-center mb-8 md:mb-12">
 <OrnamentHeadpiece className="mx-auto mb-5 max-w-[400px]" />
 <p className="font-sans text-caption font-semibold uppercase tracking-[1.6px] text-gold/85 mb-3">
 {t(m, "reading.eyebrow")}
 </p>
 <h1 className="font-display-serif text-heading md:text-display text-paper leading-[1.05]">
 {t(m, "reading.h1")}
 </h1>
 <p className="mt-4 font-serif italic text-ui md:text-body text-paper/70 max-w-[520px] mx-auto leading-[1.65]">
 {t(m, "reading.subtitle")}
 </p>
 </header>

 {/* Reading first: continue, then where to go next. */}
 <ContinueReading />
 <NextRead paths={PATHS} fallback={DEFAULT_NEXT} />

 {/* Popular reads, an editor's shelf. */}
 <section className="mt-12 md:mt-16">
 <h2 className="font-sans text-caption font-semibold uppercase tracking-[1.6px] text-gold/85 mb-5">
 {t(m, "reading.popular")}
 </h2>
 <ul className="divide-y divide-gold/20 border-y border-gold/20">
 {POPULAR.map((p) => (
 <li key={p.href}>
 <Link
 href={p.href}
 className="group flex items-center gap-5 py-5 px-1 hover:bg-gold/[0.04] transition-colors"
 >
 <div className="min-w-0 flex-1">
 <p className="font-display-serif text-lede md:text-title-sm text-paper leading-tight group-hover:text-gold transition-colors">
 {p.title}
 </p>
 <p className="mt-1.5 font-serif italic text-detail md:text-ui text-paper/65 leading-[1.55]">
 {p.byline}
 </p>
 </div>
 <span
 aria-hidden
 className="shrink-0 self-center font-serif text-lede text-paper/30 group-hover:text-gold transition-colors"
 >
 →
 </span>
 </Link>
 </li>
 ))}
 </ul>
 </section>

 {/* Enter deeper, the reading surfaces. */}
 <section className="mt-12 md:mt-16">
 <h2 className="font-sans text-caption font-semibold uppercase tracking-[1.6px] text-gold/85 mb-5">
 {t(m, "reading.enterDeeper")}
 </h2>
 <ul className="divide-y divide-gold/20 border-y border-gold/20">
 {ROWS.map(({ label, href, blurb, Icon }) => (
 <li key={label}>
 <Link
 href={href}
 className="group flex items-start gap-5 py-5 md:py-6 px-1 hover:bg-gold/[0.04] transition-colors"
 >
 <span className="shrink-0 inline-flex items-center justify-center h-9 w-9 text-gold/85 group-hover:text-gold transition-colors">
 <Icon size={28} />
 </span>
 <div className="min-w-0 flex-1">
 <p className="font-display-serif text-lede md:text-title-sm text-paper leading-tight group-hover:text-gold transition-colors">
 {label}
 </p>
 <p className="mt-1.5 font-serif italic text-detail md:text-ui text-paper/65 leading-[1.55]">
 {blurb}
 </p>
 </div>
 <span
 aria-hidden
 className="shrink-0 self-center font-serif text-lede text-paper/30 group-hover:text-gold transition-colors"
 >
 →
 </span>
 </Link>
 </li>
 ))}
 </ul>
 </section>

 {/* Topics, quiet guided reading. */}
 {topics.length > 0 && (
 <section className="mt-12 md:mt-16">
 <h2 className="font-sans text-caption font-semibold uppercase tracking-[1.6px] text-gold/85 mb-5">
 {t(m, "reading.topics")}
 </h2>
 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
 {topics.map((tp) => (
 <Link
 key={tp.slug}
 href={`/topics/${tp.slug}`}
 className="group rounded-card border border-gold/20 bg-paper/[0.02] p-5 hover:bg-gold/[0.04] hover:border-gold/40 transition-colors"
 >
 <p className="font-display-serif text-lede text-paper leading-tight group-hover:text-gold transition-colors">
 {tp.title}
 </p>
 </Link>
 ))}
 </div>
 </section>
 )}

 {/* Quiet colophon to close the page. */}
 <p className="mt-14 text-center font-display-serif italic text-ui text-paper/45 leading-[1.55]">
 <T k="study.colophon1" />
 <br />
 <T k="study.colophon2" />
 </p>
 </article>
 </section>
 </div>
 </>
 );
}
