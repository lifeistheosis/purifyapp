import Link from "next/link";
import { MobileShell } from "./MobileShell";
import { MobileHeader } from "./MobileHeader";
import { SectionMasthead } from "./SectionMasthead";
import { MobileSectionLabel } from "./MobileSectionLabel";
import { DiscoverIndex, type DiscoverEntry } from "./DiscoverIndex";
import { UserAvatarSmall } from "@/components/today/UserAvatarSmall";
import { OrnamentHeadpiece } from "@/components/calendar/OrnamentHeadpiece";
import { ContinueReading } from "@/components/reading/ContinueReading";
import { NextRead } from "@/components/reading/NextRead";
import { HaloedHead } from "@/components/ui/icons/HaloedHead";
import { Church } from "@/components/ui/icons/Church";
import { Book } from "@/components/ui/icons/Book";
import { Quill } from "@/components/ui/icons/Quill";
import { Codex } from "@/components/ui/icons/Codex";
import { collections } from "@/lib/reading/surfaces";
import type { NextSuggestion, PopularRead, ReadingPath } from "@/lib/reading/curated";
import { loadAllTopics } from "@/lib/topics/topics";
import { getServerLocale } from "@/lib/i18n/server";
import { getMessages, t } from "@/lib/i18n";
import { T } from "@/components/i18n/T";

/**
 * Reading hub, mobile. Mirrors the desktop /reading order, reading first:
 * masthead → continue reading → your next read → popular reads → enter
 * deeper (surfaces) → topics → colophon. Curated rails come in as props;
 * surfaces and topics are derived here server-side.
 */
export async function ReadingMobile({
 popular,
 paths,
 fallback,
}: {
 popular: PopularRead[];
 paths: ReadingPath[];
 fallback: NextSuggestion[];
}) {
 const locale = await getServerLocale();
 const m = getMessages(locale);
 const topics = await loadAllTopics();
 const hasCollections = collections().length > 0;

 const entries: DiscoverEntry[] = [
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
 entries.push({
 label: t(m, "reading.surface.collections"),
 href: "/saints/gregory-palamas/essence-and-energies",
 blurb: t(m, "reading.surface.collectionsBlurb"),
 Icon: Codex,
 });
 }

 return (
 <MobileShell
 header={<MobileHeader titleKey="nav.reading" trailing={<UserAvatarSmall />} />}
 >
 {/* The Evangelist Luke at his desk: the reading room's own subject. */}
 <SectionMasthead
 section="reading"
 eyebrow={t(m, "reading.eyebrow")}
 title={t(m, "reading.h1")}
 />
 <header className="text-center mb-7">
 <OrnamentHeadpiece className="mx-auto mb-4 max-w-[320px]" />
 <p className="font-serif italic text-ui text-paper/70 max-w-[420px] mx-auto leading-[1.6]">
 {t(m, "reading.subtitle")}
 </p>
 </header>

 <ContinueReading />
 <div className="mt-7">
 <NextRead paths={paths} fallback={fallback} />
 </div>

 <div className="mt-7">
 <MobileSectionLabel>{t(m, "reading.popular")}</MobileSectionLabel>
 <ul className="divide-y divide-gold/20 border-y border-gold/20">
 {popular.map((p) => (
 <li key={p.href}>
 <Link
 href={p.href}
 className="group flex items-center gap-4 py-4 px-1 active:bg-gold/[0.04] transition-colors"
 >
 <div className="min-w-0 flex-1">
 <p className="font-display-serif text-lede text-paper leading-tight group-active:text-gold transition-colors">
 {p.title}
 </p>
 <p className="mt-1 font-serif italic text-detail text-paper/65 leading-[1.5]">
 {p.byline}
 </p>
 </div>
 <span
 aria-hidden
 className="shrink-0 self-center font-serif text-body text-paper/30 group-active:text-gold transition-colors"
 >
 →
 </span>
 </Link>
 </li>
 ))}
 </ul>
 </div>

 <div className="mt-7">
 <MobileSectionLabel>{t(m, "reading.enterDeeper")}</MobileSectionLabel>
 <DiscoverIndex entries={entries} />
 </div>

 {topics.length > 0 && (
 <div className="mt-7">
 <MobileSectionLabel>{t(m, "reading.topics")}</MobileSectionLabel>
 <ul className="divide-y divide-gold/20 border-y border-gold/20">
 {topics.map((tp) => (
 <li key={tp.slug}>
 <Link
 href={`/topics/${tp.slug}`}
 className="group flex items-center gap-4 py-4 px-1 active:bg-gold/[0.04] transition-colors"
 >
 <p className="min-w-0 flex-1 font-display-serif text-lede text-paper leading-tight group-active:text-gold transition-colors">
 {tp.title}
 </p>
 <span
 aria-hidden
 className="shrink-0 self-center font-serif text-body text-paper/30 group-active:text-gold transition-colors"
 >
 →
 </span>
 </Link>
 </li>
 ))}
 </ul>
 </div>
 )}

 <p className="mt-10 text-center font-display-serif italic text-detail text-paper/45 leading-[1.55]">
 <T k="ui.throughThePrayersOfOur" />
 <br />
 <T k="ui.lordJesusChristOurGod" />
 </p>
 </MobileShell>
 );
}
