import Link from "next/link";
import { notFound } from "next/navigation";
import { COUNCILS, getCouncil } from "@/lib/councils/councils";
import { loadCouncilDocument } from "@/lib/councils/load";
import { T } from "@/components/i18n/T";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { MobileWorkProgressBar } from "@/components/saints/MobileWorkProgressBar";
import { MobileWorkActions } from "@/components/saints/MobileWorkActions";
import { ReaderPrefsProvider, ReadingModeController } from "@/components/reader/ReaderPrefs";
import { CouncilSections } from "@/components/councils/CouncilSections";
import { CouncilReaderHere, CouncilSourceHere } from "@/components/councils/CouncilTextHere";
import { OpeningCover } from "@/components/reading/OpeningCover";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { documentMinutes } from "@/lib/councils/books";
import { editionOf } from "@/lib/councils/edition";
import { authorLine, councilPicture, cropOf, eraOfYear } from "@/lib/councils/page";
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
 * Since 1.8's round 6 it reads as the Bible reads (the owner's pick A of
 * r3-29): one section at a time as its own page, in the room's reader
 * (components/councils/CouncilReader.tsx), in the reader's own typeface and
 * size, with the Bible's pill and its books sheet as the contents, and its
 * place kept to the paragraph. The book's page (components/councils/
 * CouncilBookHeader.tsx: its cover, a window onto the council's icon; the
 * council and its year, to the council's page; Start reading, or Continue)
 * is About this book, a sheet from the contents and from •••. No bar: the
 * way back and ••• on round plates. The text is written into the page, each
 * section at its own address, which the quotations elsewhere in the app open.
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
 // The page writes the English. A reader whose language has the document in
 // its own file reads that, loaded on the device (1.9,
 // components/councils/CouncilTextHere.tsx): in the apps the server is the
 // build and knows no reader, so until 1.9 the German Symbol of the Faith,
 // chosen here, reached no reader of the apps.
 const loaded = await loadCouncilDocument(slug, document);
 if (!loaded) notFound();
 const { content } = loaded;

 const picture = councilPicture(c.slug, IS_STATIC_EXPORT);
 const sections = content.sections.map((s) => ({ n: s.n, title: s.title }));
 const positionKey = `councils/${c.slug}`;

 const about = {
  title: content.title,
  subtitle: content.subtitle ?? docRef.subtitle,
  blurb: docRef.blurb,
  author: authorLine(c),
  council: { href: `/councils/${c.slug}`, name: c.byname },
  cover: picture ? { src: picture.src, focusY: 30, crop: cropOf(c.slug, docRef.slug) } : undefined,
  minutes: documentMinutes(c.slug, docRef.slug),
  era: eraOfYear(c.year),
  edition: editionOf(content.source),
  positionKey,
  docSlug: docRef.slug,
  first: content.sections[0]?.n ?? 1,
  total: content.sections.length,
 };

 return (
 <ReaderPrefsProvider>
 {/* The Bible's page (1.8, the owner's pick A of r3-29): the way back and
     ••• on round plates over the page, the reading line along its top. */}
 <MobileTopBar plates back backFallback={`/reading/councils/${c.slug}`} trailing={<MobileWorkActions />} />
 <MobileWorkProgressBar />
 <ReadingModeController />

 <section className="bg-night px-5 md:px-8 under-plates md:pt-16">
 <div className="mx-auto max-w-[1100px] w-full">
 {/* The book opens on its cover (1.9): over the head of the section it
     opens on, where the cover tapped on the council's shelf travels to
     (components/reading/OpeningCover.tsx). The shelf's own card: the same
     key, title, author line and window onto the council's icon
     (lib/councils/books.ts, councilBook). */}
 <OpeningCover
  owner={positionKey}
  slug={docRef.slug}
  first={about.first}
  card={{ key: `councils/${c.slug}/${docRef.slug}`, title: docRef.title, author: about.author, cover: about.cover }}
 />
 {/* The document's own page (its cover, what it is, Start reading or
     Continue) is About this book, a sheet over the section (r3-29 A). Over
     the reader, for a reader in another language, the line that says the
     text is English (components/i18n/StillInEnglish.tsx). */}
 <CouncilReaderHere docKey={`${c.slug}/${docRef.slug}`} positionKey={positionKey} docSlug={docRef.slug} title={content.title} sections={sections} about={about}>
 <CouncilSections content={content} />
 </CouncilReaderHere>

 <footer id="source" className="mx-auto max-w-[680px] scroll-mt-24 pt-8 border-t border-paper/8">
 <p className="font-sans text-caption text-paper/40">
 <T k="prayers.reader.sourceLabel" /> <CouncilSourceHere docKey={`${c.slug}/${docRef.slug}`} english={content.source} />
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
 </div>
 </section>
 </ReaderPrefsProvider>
 );
}
