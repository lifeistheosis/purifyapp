import { notFound } from "next/navigation";
import { ChapterReader } from "@/components/bible/ChapterReader";
import { ChapterScreen } from "@/components/bible/ChapterScreen";
import { LazyStudyRail } from "@/components/bible/LazyStudyRail";
import { LicensedChapterReader } from "@/components/bible/LicensedChapterReader";
import { MobileReaderActions } from "@/components/bible/MobileReaderActions";
import { StudyRail } from "@/components/bible/StudyRail";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { NAMED_PASSAGES, allChapterParams, getBook, passageForChapter } from "@/lib/bible/books";
import { hasCommentary as hasBookCommentary } from "@/lib/bible/commentary-index";
import { loadChapter, loadIntro, loadIntroFacts, loadIntroQuotes, loadCommentary, loadParagraphStarts, type IntroQuote } from "@/lib/bible/load";
import type { ListedSource } from "@/components/citations/Marked";
import { shownCite } from "@/lib/citations/shown";
import { crossRefVerses, interlinearState } from "@/lib/bible/chapterExtras";
import {
 isLicensed,
 isApiConfigured,
 fetchLicensedChapter,
} from "@/lib/bible/api-bible";
import { IS_STATIC_EXPORT } from "@/lib/platform/buildTarget";

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
 // The native static export can't read searchParams (would force dynamic). The
 // ?v= licensed-translation/verse param is online/client-only anyway, so the
 // export always renders the bundled public-domain text. Website unchanged.
 const { v } = (IS_STATIC_EXPORT ? {} : await searchParams) as { v?: string };
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
 // the public-domain text, never overlaid on licensed translations. The
 // per-book availability check also blocks any book whose interlinear data is
 // known to be wrong, all-or-nothing, so a reader never gets half of it.
 // See lib/bible/interlinearBooks.ts.
 // The Old Testament's Greek (Swete's Septuagint) sits beside the English
 // only in a chapter shown to pair verse for verse (lib/bible/greekText.ts),
 // renumbered past a psalm's title where Swete counts it; elsewhere a note
 // says why it is missing rather than showing it beside the wrong verse.
 const greek = usingLicensed ? "none" : await interlinearState(book, chapterNum);
 const showInterlinear = greek === "shown";
 const greekNumberedApart = greek === "apart";
 // The Greek, the lexicon and the cross-references are not props of the
 // reader any more. Each is a static file it fetches when it is asked for
 // (app/bible-data/; lib/bible/chapterExtras.ts says why and what it saved).
 // The page says only which verses have something behind them.
 const [data, intro, introFacts, introQuotes, commentary, refVerses, paragraphStarts] = await Promise.all([
 usingLicensed ? Promise.resolve(null) : loadChapter(book, chapterNum),
 chapterNum === 1 ? loadIntro(book) : Promise.resolve(null),
 chapterNum === 1 ? loadIntroFacts(book) : Promise.resolve(null),
 chapterNum === 1 ? loadIntroQuotes(book) : Promise.resolve([] as IntroQuote[]),
 loadCommentary(book, chapterNum),
 // Cross-references (Plus): the New Testament only, on the public-domain
 // text only, because they are numbered as that text is. lib/bible/crossRefs.ts.
 usingLicensed ? Promise.resolve([] as number[]) : crossRefVerses(book, chapterNum),
 // Paragraph view (1.7): where this chapter's paragraphs begin.
 usingLicensed ? Promise.resolve([] as number[]) : loadParagraphStarts(book, chapterNum),
 ]);
 if (!usingLicensed && !data) notFound();
 const totalVerses = usingLicensed ? licensed!.verseCount : data!.verses.length;

 const commentaryVerses = Object.keys(commentary)
 .map(Number)
 .filter((n) => (commentary[String(n)]?.length ?? 0) > 0);
 // Two different questions, and conflating them is what made the rail's empty
 // state unreachable. This chapter having notes governs the per-verse glyph
 // and the mobile sheet, because there is nothing to open without them. The
 // BOOK having notes governs the desktop rail, because a reader who was told
 // on the index that this book has the Fathers deserves to be told here when
 // a particular chapter does not. Genesis carries the badge on one chapter of
 // fifty; the other forty-nine used to render nothing at all and look
 // identical to a book we never touched.
 const hasChapterCommentary = commentaryVerses.length > 0;
 const bookHasCommentary = hasBookCommentary(book);

 // The quotations in the book's introduction, numbered in the order they
 // stand, each with its line (1.8): the verses in the app's Bible, or the
 // plain word that the words are not that Bible's, or not yet traced.
 const introSources: ListedSource[] = intro
 ? introQuotes
 .map((q) => ({ q, at: intro.indexOf(q.words) }))
 .filter(({ at }) => at >= 0)
 .sort((a, b) => a.at - b.at)
 .map(({ q }, i) => ({ words: q.words, n: i + 1, shown: shownCite(q.cite) }))
 : [];

 // The screen is one client component, so a chapter's payload names it once
 // and not each of the twenty-odd parts it is made of
 // (components/bible/ChapterScreen.tsx says what that weighed). This page
 // reads the chapter and fills the two places that differ between the apps
 // and the website: the verses, and the Fathers beside them.
 return (
  <ChapterScreen
   book={b!}
   chapter={chapterNum}
   totalVerses={totalVerses}
   showInterlinear={showInterlinear}
   greekNumberedApart={greekNumberedApart}
   configuredLicensed={configuredLicensed}
   licensedId={licensedId}
   usingLicensed={usingLicensed}
   intro={intro}
   introFacts={introFacts}
   introSources={introSources}
   hasChapterCommentary={hasChapterCommentary}
   namedWhole={passageForChapter(book, chapterNum)}
   namedInner={NAMED_PASSAGES.filter((p) => p.book === book && p.chapter === chapterNum && p.verse).map((p) => ({
    id: p.id,
    verse: p.verse!,
   }))}
   // The phone's and the tablet's top, here on the web too: no bar at all
   // (1.8, the owner's pick B of round 2, "The page"), only round plates
   // over the page, the way back to /bible on one side and Aa and ••• on the
   // other (and the site menu on the web). The chapter names itself with its
   // own title, and the verse being read is on the pill at the foot. Hidden
   // on md+; desktop uses the AppNav. Mounted here and not inside the
   // screen: the back bar's list of screens with a bar of their own is
   // checked against pages and layouts (lib/nav/__tests__/backBar.test.ts),
   // and these plates are this page's bar for it.
   topBar={
    <MobileTopBar
     plates
     back="/bible"
     trailing={
      <MobileReaderActions
       book={book}
       bookName={b!.name}
       chapter={chapterNum}
       showInterlinear={showInterlinear}
       configuredLicensed={configuredLicensed}
      />
     }
    />
   }
   reader={
    usingLicensed ? (
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
      // The website writes the commentary into the page, so a search engine
      // reads it there. The apps carry it as a file and fetch it when a
      // verse's commentary is opened: it was the heaviest thing on the page.
      commentary={IS_STATIC_EXPORT ? undefined : commentary}
      hasInterlinear={showInterlinear}
      crossRefVerses={refVerses}
      testament={b!.testament}
      paragraphStarts={paragraphStarts}
     />
    )
   }
   rail={
    !bookHasCommentary ? null : IS_STATIC_EXPORT ? (
     <LazyStudyRail book={book} chapter={chapterNum} empty={!hasChapterCommentary} />
    ) : (
     <StudyRail commentary={commentary} />
    )
   }
  />
 );
}
