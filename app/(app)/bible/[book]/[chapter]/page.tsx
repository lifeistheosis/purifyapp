import { notFound } from "next/navigation";
import { BookChapterSidebar } from "@/components/bible/BookChapterSidebar";
import { ChapterReader } from "@/components/bible/ChapterReader";
import { LicensedChapterReader } from "@/components/bible/LicensedChapterReader";
import { ChapterPager } from "@/components/bible/ChapterPager";
import { BibleSearch } from "@/components/bible/BibleSearch";
import { BookSwitcher } from "@/components/bible/BookSwitcher";
import { ChapterKeyNav } from "@/components/bible/ChapterKeyNav";
import { StudyRail } from "@/components/bible/StudyRail";
import { TranslationSwitcher } from "@/components/bible/TranslationSwitcher";
import { RestoreTranslation } from "@/components/bible/RestoreTranslation";
import { InterlinearToggle } from "@/components/bible/InterlinearToggle";
import { ReadingProgressBar } from "@/components/bible/ReadingProgressBar";
import { ChapterStickyHeader } from "@/components/bible/ChapterStickyHeader";
import { ChapterBookmarkButton } from "@/components/bible/ChapterBookmarkButton";
import { MobileChapterStrip } from "@/components/bible/MobileChapterStrip";
import { MobileChapterPill } from "@/components/bible/MobileChapterPill";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { MobileReaderActions } from "@/components/bible/MobileReaderActions";
import { ReaderSettingsMenu } from "@/components/bible/ReaderSettingsMenu";
import { VerseFocusFlash } from "@/components/bible/VerseFocusFlash";
import {
 ReaderPrefsProvider,
 ReaderFocusButton,
 ReaderFocusController,
} from "@/components/reader/ReaderPrefs";
import { allChapterParams, getBook } from "@/lib/bible/books";
import {
 loadChapter,
 loadIntro,
 loadCommentary,
 loadOriginal,
 loadEnglishTagged,
} from "@/lib/bible/load";
import { strongsMap } from "@/lib/bible/strongs";
import {
 isLicensed,
 isApiConfigured,
 fetchLicensedChapter,
} from "@/lib/bible/api-bible";

type Params = Promise<{ book: string; chapter: string }>;
type Search = Promise<{ v?: string }>;

// generateStaticParams enumerates every canonical book/chapter, so all valid
// pages are pre-rendered; dynamicParams=false makes invalid combos 404 (instead
// of on-demand → notFound, the same result) and is required by the Android
// static export. Licensed translations are still fetched live client-side
// (a query-param swap), unaffected by route dynamicParams.
export const dynamicParams = false;

const LICENSED_LABEL: Record<string, string> = {
 niv: "New International Version",
 nkjv: "New King James Version",
 nlt: "New Living Translation",
};

export function generateStaticParams() {
 return allChapterParams();
}

export async function generateMetadata({ params }: { params: Params }) {
 const { book, chapter } = await params;
 const b = getBook(book);
 if (!b) return { title: "The Orthodox Bible" };
 return { title: `${b.name} ${chapter}` };
}

export default async function BibleChapterPage({
 params,
 searchParams,
}: {
 params: Params;
 searchParams: Search;
}) {
 const { book, chapter } = await params;
 // Android static export can't read searchParams (would force dynamic). The
 // ?v= licensed-translation/verse param is online/client-only anyway, so the
 // export always renders the bundled public-domain text. Website unchanged.
 const { v } = (process.env.BUILD_TARGET === "android"
   ? {}
   : await searchParams) as { v?: string };
 const chapterNum = Number(chapter);
 const b = getBook(book);
 if (!b || !Number.isInteger(chapterNum) || chapterNum < 1 || chapterNum > b.chapters) {
 notFound();
 }
 // A licensed translation (NKJV/NIV/NLT) is fetched live from API.Bible when
 // selected (?v=) and configured. It renders verbatim with no Strong's /
 // interlinear overlay (content integrity). Falls back to public domain when
 // the book isn't in the translation (e.g. deuterocanon) or the API fails.
 // Which licensed translations are actually configured (key + bibleId). Passed
 // to the switcher so it can grey out ones that would silently fall back.
 const configuredLicensed = (["niv", "nkjv", "nlt"] as const).filter((t) =>
 isApiConfigured(t),
 );
 const licensedId = v && isLicensed(v) && isApiConfigured(v) ? v : null;
 const licensed = licensedId
 ? await fetchLicensedChapter(licensedId, book, chapterNum)
 : null;
 const usingLicensed = Boolean(licensed);

 // Interlinear (Greek + English Strong's tags) is NT-only, and only ever on
 // the public-domain text, never overlaid on licensed translations.
 const isNT = b!.testament === "NT";
 const showInterlinear = isNT && !usingLicensed;
 const [data, intro, commentary, original, englishTagged] = await Promise.all([
 usingLicensed ? Promise.resolve(null) : loadChapter(book, chapterNum),
 chapterNum === 1 ? loadIntro(book) : Promise.resolve(null),
 loadCommentary(book, chapterNum),
 showInterlinear ? loadOriginal(book, chapterNum) : Promise.resolve(null),
 showInterlinear ? loadEnglishTagged(book, chapterNum) : Promise.resolve(null),
 ]);
 if (!usingLicensed && !data) notFound();
 const totalVerses = usingLicensed ? licensed!.verseCount : data!.verses.length;

 const originalByNum: Record<number, string> = {};
 const tokensByNum: Record<
 number,
 { w: string; s?: string; p?: string }[]
 > = {};
 const usedStrongs = new Set<string>();
 for (const v of original?.verses ?? []) {
 originalByNum[v.n] = v.text;
 if (v.tokens?.length) {
 tokensByNum[v.n] = v.tokens;
 for (const t of v.tokens) if (t.s) usedStrongs.add(t.s);
 }
 }
 // Per-chapter Strong's mini-lexicon (only the entries this chapter uses).
 // Keeps the prop payload at a few KB instead of shipping the whole 557 KB.
 const strongs = strongsMap(Array.from(usedStrongs));

 // English-side tokens (NT only). Each token has a Strong's number that
 // matches the Greek token's number, used for hover sync.
 const englishTokensByNum: Record<
 number,
 { w: string; s?: string }[]
 > = {};
 for (const v of englishTagged?.verses ?? []) {
 if (v.tokens?.length) englishTokensByNum[v.n] = v.tokens;
 }

 const commentaryVerses = Object.keys(commentary)
 .map(Number)
 .filter((n) => (commentary[String(n)]?.length ?? 0) > 0);
 const hasCommentary = commentaryVerses.length > 0;

 return (
 <ReaderPrefsProvider>
 <ReaderFocusController />
 {/* Mobile-only YouVersion-style top bar: back to /bible, book +
 chapter as the title, trailing icon cluster (bookmark stub +
 settings sheet). Hidden on md+; desktop uses the AppNav. */}
 <MobileTopBar
 title={`${b!.name} ${chapterNum}`}
 back="/bible"
 trailing={<MobileReaderActions book={book} bookName={b!.name} chapter={chapterNum} />}
 />
 <div className="bg-night flex">
 <ChapterKeyNav slug={book} chapter={chapterNum} />
 <VerseFocusFlash />
 <ReadingProgressBar
 slug={book}
 bookName={b!.name}
 chapter={chapterNum}
 totalVerses={totalVerses}
 />
 <ChapterStickyHeader
 bookName={b!.name}
 chapter={chapterNum}
 totalVerses={totalVerses}
 />
 <MobileChapterPill slug={book} chapter={chapterNum} />
 <div data-reader-chrome className="contents">
 <BookChapterSidebar book={b!} current={chapterNum} />
 </div>
 {/* Extra mobile top padding accounts for the fixed ReadingProgressBar
 context strip (~28px) sitting under the 72px sticky navbar. */}
 <section className="flex-1 px-5 md:px-10 pt-14 md:pt-16 pb-10 md:pb-16 safe-pb-reader min-w-0">
 <div className="mx-auto max-w-[1200px] w-full">
 {/* Row 1, always: Translation + Book at their natural width.
 On desktop the typography cluster (font + interlinear) sits to
 their right. On mobile that cluster is split off into row 2 below.
 Switchers are kept at content width (not stretched) so they don't
 shift as the book name length changes. */}
 {/* Desktop toolbar: a single tidy row, two semantic groups —
   "which scripture" on the left (Translation · Book · Save) and
   "how to read it" on the right (Reader prefs menu · Interlinear ·
   Focus). The three reader-preference cycle-pills (Size, Font, Spacing)
   are collapsed inside the Reader menu so the row stays at six controls
   instead of eight, matching how Kindle/Apple Books/Medium handle
   set-and-forget prefs. Wraps as a unit if pinched. */}
 <div
 className="mb-4 hidden md:flex items-center gap-2.5 flex-wrap"
 data-reader-chrome
 >
 <TranslationSwitcher
 currentSlug={book}
 configuredLicensed={configuredLicensed}
 />
 <BookSwitcher currentSlug={book} />
 <ChapterBookmarkButton book={book} bookName={b!.name} chapter={chapterNum} />
 <div className="ml-auto flex items-center gap-2.5 flex-wrap justify-end">
 <ReaderSettingsMenu showInterlinear={showInterlinear} embedded />
 {showInterlinear && <InterlinearToggle />}
 <ReaderFocusButton />
 </div>
 </div>
 {/* Mobile keeps its own compact row (the menu carries Focus and
   Interlinear inside on mobile). Identical to before. */}
 <div className="md:hidden mb-4 flex items-center gap-2.5 flex-wrap" data-reader-chrome>
 <TranslationSwitcher
 currentSlug={book}
 configuredLicensed={configuredLicensed}
 />
 <BookSwitcher currentSlug={book} />
 </div>
 {/* Row 2, mobile only: Interlinear pill (NT) + Reader chip sit as a
 pair at the start of the row, matching the Translation + Book
 cluster above. Previously the Reader chip floated to the far right
 via ml-auto, which read as "misplaced" against the otherwise
 left-aligned chips. */}
 <div className="md:hidden mb-4 flex items-center gap-3 flex-wrap" data-reader-chrome>
 {showInterlinear && <InterlinearToggle />}
 <ReaderSettingsMenu showInterlinear={showInterlinear} />
 </div>
 <div className="mb-6" data-reader-chrome>
 <BibleSearch />
 </div>
 <div data-reader-chrome className="contents">
 <MobileChapterStrip book={b!} current={chapterNum} />
 </div>

 <RestoreTranslation testament={b!.testament} />

 <div className="reader-grid lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
 {/* Reader column */}
 <div className="min-w-0 mx-auto w-full max-w-[680px]">
 <header id="chapter-title" className="mb-6">
 <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/55">
 {b!.name}
 </p>
 <h1 className="mt-1 font-serif text-display-sm md:text-display leading-none text-paper">
 Chapter {chapterNum}
 </h1>
 </header>
 <hr className="mb-8 border-0 h-px bg-white/10" />

 {intro && (
 <details className="mb-10 group rounded-md border border-paper/10 bg-paper/[0.03] open:bg-paper/[0.05] transition-colors">
 <summary className="cursor-pointer list-none px-6 py-4 flex items-center justify-between">
 <span className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/55 group-open:text-paper/75 transition-colors">
 About this book
 </span>
 <span
 aria-hidden
 className="text-paper/55 group-open:rotate-180 transition-transform duration-200 text-caption"
 >
 ▾
 </span>
 </summary>
 <div className="px-6 pb-6 -mt-1 font-serif text-body leading-[1.7] text-paper/80 whitespace-pre-line">
 {intro}
 </div>
 </details>
 )}

 {/* Commentary discoverability. The desktop study rail (lg+) is always
 visible; below lg the Fathers open by tapping a marked verse number,
 which first-time readers don't discover (community, #purify-suggestions:
 "How am I able to read his commentary?"). This names the affordance. */}
 {hasCommentary && !usingLicensed && (
 <p className="mb-8 lg:hidden rounded-md border border-accent/25 bg-accent/[0.06] px-4 py-3 font-sans text-detail leading-[1.55] text-paper/80">
 <span className="font-semibold text-paper">Read with the Fathers.</span>{" "}
 Verse numbers shown in{" "}
 <span className="font-semibold text-[#f2594e]">red with a dot</span> have
 patristic commentary, St. John Chrysostom and others. Tap one to read it.
 </p>
 )}

 {usingLicensed ? (
 <LicensedChapterReader
 chapter={licensed!}
 transId={licensedId!}
 translationLabel={LICENSED_LABEL[licensedId!] ?? licensedId!}
 />
 ) : (
 <ChapterReader
 book={book}
 bookName={b!.name}
 chapter={chapterNum}
 verses={data!.verses}
 commentaryVerses={commentaryVerses}
 commentary={commentary}
 originalByNum={originalByNum}
 tokensByNum={tokensByNum}
 englishTokensByNum={englishTokensByNum}
 strongs={strongs}
 />
 )}

 <ChapterPager slug={book} chapter={chapterNum} v={licensedId ?? undefined} />

 {!usingLicensed && (
 <p className="hidden md:block mt-10 mb-3 font-sans text-eyebrow text-paper/55 leading-[1.6]" data-reader-chrome>
 ← → chapters · drag across words to highlight a phrase · click any Greek word for definition · Cmd+Enter to save a note
 </p>
 )}

 {!usingLicensed && (
 <p className="mt-6 md:mt-3 font-sans text-eyebrow text-paper/55 leading-[1.6]">
 Old Testament: Brenton&rsquo;s English Septuagint (1851, public domain).
 New Testament: King James Version (public domain). Patristic
 commentary from Schaff&rsquo;s Ante-Nicene and Nicene Fathers
 (public domain).
 </p>
 )}

 {/* Mobile + tablet: commentary is opened on demand via the
 verse-number glyph; ChapterReader owns the MobileCommentarySheet. */}
 </div>

 {/* Desktop study rail */}
 {hasCommentary && (
 <aside className="hidden lg:block" data-reader-chrome>
 <div className="sticky top-[88px] max-h-[calc(100dvh-104px)] overflow-y-auto scrollbar-thin pr-2 -mr-2">
 <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
 Patristic commentary
 </p>
 <StudyRail commentary={commentary} />
 </div>
 </aside>
 )}
 </div>
 </div>
 </section>
 </div>
 </ReaderPrefsProvider>
 );
}
