import Link from "next/link";
import { notFound } from "next/navigation";
import { COUNCILS, getCouncil } from "@/lib/councils/councils";
import { loadCouncilDocument } from "@/lib/councils/load";
import { getServerLocale } from "@/lib/i18n/server";
import { ContentNotYetTranslated } from "@/components/i18n/ContentNotYetTranslated";
import { T } from "@/components/i18n/T";
import { SaintNames } from "@/components/saints/SaintNames";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { MobileWorkProgressBar } from "@/components/saints/MobileWorkProgressBar";
import { MobileWorkActions } from "@/components/saints/MobileWorkActions";
import { ReaderPrefsProvider, ReadingModeController } from "@/components/reader/ReaderPrefs";
import { CouncilBookHeader } from "@/components/councils/CouncilBookHeader";
import { CouncilReader } from "@/components/councils/CouncilReader";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { documentMinutes } from "@/lib/councils/books";
import { authorLine, councilPicture, cropOf, editionOf, eraOfYear } from "@/lib/councils/page";
import { IS_STATIC_EXPORT } from "@/lib/platform/buildTarget";

export function generateStaticParams() {
 return COUNCILS.flatMap((c) =>
 c.documents
 .filter((d) => !d.href)
 .map((d) => ({ slug: c.slug, document: d.slug })),
 );
}

export async function generateMetadata({
 params,
}: {
 params: Promise<{ slug: string; document: string }>;
}) {
 const { slug, document } = await params;
 const c = getCouncil(slug);
 const doc = c?.documents.find((d) => d.slug === document && !d.href);
 if (!c || !doc) return { title: "Document not found" };
 return {
 title: `${doc.title}, ${c.byname}`,
 description: doc.blurb,
 };
}

/**
 * A council's document as a book in the reading room (1.8, the owner's
 * build 80 note 12 and his pick of r3-03: "every book opened in the room's
 * reader, with its chapters, Start reading and Continue"). Until 1.8 the
 * thirty-eight documents the app carries opened on plain pages.
 *
 * The book's page above (components/councils/CouncilBookHeader.tsx): its
 * cover, a window onto the council's icon; the council and its year as the
 * author line, to the council's page; Start reading, or Continue. The text
 * below in the room's reader (components/councils/CouncilReader.tsx), in the
 * reader's own typeface and size, with its chapters, the section pill and
 * the progress bar, and its place kept. The top bar is a work's: the way
 * back, the book's name once its title has gone up, and the reader's
 * settings. The text is written into the page, each section at its own
 * address, which the quotations elsewhere in the app open.
 */
export default async function CouncilDocumentPage({
 params,
}: {
 params: Promise<{ slug: string; document: string }>;
}) {
 const { slug, document } = await params;
 const c = getCouncil(slug);
 if (!c) notFound();
 const docRef = c.documents.find((d) => d.slug === document && !d.href);
 if (!docRef) notFound();
 const locale = await getServerLocale();
 const loaded = await loadCouncilDocument(slug, document, locale);
 if (!loaded) notFound();
 const { content, isLocalized } = loaded;

 const picture = councilPicture(c.slug, IS_STATIC_EXPORT);
 const sections = content.sections.map((s) => ({ n: s.n, title: s.title }));
 const positionKey = `councils/${c.slug}`;

 return (
 <ReaderPrefsProvider>
 <MobileTopBar
  title={content.title}
  back
  backFallback={`/reading/councils/${c.slug}`}
  trailing={<MobileWorkActions />}
  revealTitleOn="work-title"
 />
 <MobileWorkProgressBar />
 <ReadingModeController />

 <section className="bg-night px-5 md:px-8">
 <div className="mx-auto max-w-[1100px] w-full">
 <CouncilBookHeader
  title={content.title}
  subtitle={content.subtitle ?? docRef.subtitle}
  blurb={docRef.blurb}
  author={authorLine(c)}
  council={{ href: `/councils/${c.slug}`, name: c.byname }}
  cover={picture ? { src: picture.src, focusY: 30, crop: cropOf(c.slug, docRef.slug) } : undefined}
  minutes={documentMinutes(c.slug, docRef.slug)}
  era={eraOfYear(c.year)}
  edition={editionOf(content.source)}
  positionKey={positionKey}
  docSlug={docRef.slug}
  first={content.sections[0]?.n ?? 1}
  total={content.sections.length}
 />
 {!isLocalized && locale !== "en" && (
 <ContentNotYetTranslated locale={locale} kind="work" />
 )}

 <CouncilReader positionKey={positionKey} docSlug={docRef.slug} sections={sections}>
 <div className="py-10 space-y-16">
 {content.sections.map((s) => (
 // A section can be opened by its number (#s3, 1.8): a quotation
 // elsewhere in the app links to the canon or decree it quotes.
 <section
  key={s.n}
  id={`s${s.n}`}
  aria-labelledby={`s-${s.n}`}
  className="scroll-mt-24 grid grid-cols-1 lg:grid-cols-[minmax(0,680px)_minmax(0,1fr)] gap-x-12 gap-y-8"
 >
 <div className="min-w-0">
 <div className="mb-6 flex items-baseline gap-4">
 <span className="font-sans text-caption font-semibold text-paper/40 tabular-nums">
 {String(s.n).padStart(2, "0")}
 </span>
 <h2
  id={`s-${s.n}`}
  className="font-sans text-title-sm md:text-title font-semibold text-paper tracking-[-0.01em] flex-1 min-w-0"
 >
 {s.title}
 </h2>
 </div>
 {s.framing && (
 <div className="mb-8">
 <p className="font-sans text-caption font-semibold text-paper/45 mb-2">
 <T k="saints.editorsNote" />
 </p>
 <p className="font-sans text-ui md:text-body text-paper/70 leading-[1.65] italic">
 {s.framing}
 </p>
 {content.review && (
 <p className="mt-2 font-sans text-caption text-paper/45">
 <T k="study.councils.framingAwaitingReview" />
 </p>
 )}
 </div>
 )}
 {s.citation && (
 <p className="font-sans text-caption text-paper/70 font-semibold mb-4">
 {s.citation}
 </p>
 )}
 <div className="space-y-5 text-paper/90">
 {s.paragraphs.map((p, i) => (
 <p key={i}><SaintNames text={p} /></p>
 ))}
 </div>
 </div>
 {s.notes && s.notes.length > 0 && (
 <aside className="lg:pt-1 lg:border-l lg:border-paper/10 lg:pl-8">
 <p className="font-sans text-caption font-semibold text-paper/45 mb-4">
 <T k="saints.notes" />
 </p>
 <ul className="space-y-4">
 {s.notes.map((n, i) => (
 <li key={i} className="font-sans text-ui text-paper/70 leading-[1.55]">
 {n}
 </li>
 ))}
 </ul>
 </aside>
 )}
 </section>
 ))}
 </div>

 <footer id="source" className="max-w-[680px] scroll-mt-24 pt-8 border-t border-paper/8">
 <p className="font-sans text-caption text-paper/40">
 <T k="prayers.reader.sourceLabel" /> {content.source}
 </p>
 <p className="mt-6">
 <Link
  href={`/councils/${c.slug}`}
  className="tap-press hit-44 inline-flex items-center gap-0.5 font-sans text-ui font-semibold text-paper/70 hover:text-paper"
 >
 <T k="councils.shelf.page" />
 <ChevronRight size={15} className="rtl:-scale-x-100" />
 </Link>
 </p>
 </footer>
 </CouncilReader>
 </div>
 </section>
 </ReaderPrefsProvider>
 );
}
