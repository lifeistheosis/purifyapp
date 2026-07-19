import Link from "next/link";
import { notFound } from "next/navigation";
import { parseReferencesVerbose } from "@/lib/bible/parseReferences";
import { loadChapter, loadVerseRange } from "@/lib/bible/load";
import { T } from "@/components/i18n/T";

// Multi-reference result page.
//
// Stacked list of every verse, range, or chapter the user requested in
// the BibleSearch bar with comma- or semicolon-separated references.
// Single-reference queries continue to flow through the normal reader
// route — they don't reach this page.
//
// Each resolved reference renders with its own header and a small
// "<T k="bible.openInChapter" /> →" link back to the standard reader. Unresolvable
// segments render as quiet "could not resolve" rows so the user sees
// exactly which part of their query failed.

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Multi-verse · Bible",
  description:
    "A florilegium of verses, ranges, and chapters from a single query.",
};

type Search = Promise<{ q?: string }>;

export default async function MultiPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  if (!query) notFound();

  const segments = parseReferencesVerbose(query);
  if (segments.length === 0) notFound();

  // Pull text per segment. Keep the order the user typed.
  const blocks = await Promise.all(
    segments.map(async (seg) => {
      if (!seg.hit) return { ...seg, body: null };
      const h = seg.hit;
      if (h.kind === "verse") {
        const r = await loadVerseRange(h.book.slug, h.chapter, h.verse, h.verse);
        return { ...seg, body: r };
      }
      if (h.kind === "range") {
        const r = await loadVerseRange(
          h.book.slug,
          h.chapter,
          h.verseFrom,
          h.verseTo,
        );
        return { ...seg, body: r };
      }
      if (h.kind === "chapter") {
        const c = await loadChapter(h.book.slug, h.chapter);
        if (!c) return { ...seg, body: null };
        return { ...seg, body: { name: c.name, verses: c.verses } };
      }
      return { ...seg, body: null };
    }),
  );

  const resolvedCount = blocks.filter((b) => b.body && b.hit).length;
  const totalCount = segments.length;

  return (
    <section className="bg-night px-5 md:px-8 py-12 md:py-16">
      <div className="mx-auto max-w-[820px] w-full">
        <header className="mb-8 md:mb-10">
          <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/55 mb-3">
            <T k="bible.multiEyebrow" />
          </p>
          <h1 className="font-display-serif text-display-sm md:text-display text-paper tracking-[-0.01em] leading-[1.05]">
            <T k="bible.referenceCount" count={resolvedCount} />
          </h1>
          <p className="mt-3 font-serif text-lede text-paper/65">
            {resolvedCount === totalCount
              ? "Every reference in your query, stacked in order."
              : `${resolvedCount} of ${totalCount} resolved. The rest could not be matched.`}
          </p>
          <p className="mt-2 font-sans text-detail text-paper/45 break-words">
            <span className="text-paper/55"><T k="bible.multiQuery" /></span> {query}
          </p>
        </header>

        <div className="space-y-10 md:space-y-12">
          {blocks.map((b, i) => {
            if (!b.hit || !b.body) {
              return (
                <div
                  key={`unresolved-${i}`}
                  className="rounded-md border border-paper/12 bg-paper/[0.02] px-5 py-4"
                >
                  <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45 mb-1">
                    <T k="bible.multiCouldNotResolve" />
                  </p>
                  <p className="font-serif text-ui text-paper/70">{b.raw}</p>
                </div>
              );
            }
            const h = b.hit;
            const label =
              h.kind === "verse"
                ? `${b.body.name} ${h.chapter}:${h.verse}`
                : h.kind === "range"
                  ? `${b.body.name} ${h.chapter}:${h.verseFrom}–${h.verseTo}`
                  : `${b.body.name} ${h.chapter}`;
            const chapterHref = `/bible/${h.book.slug}/${h.chapter}`;
            const verseAnchor =
              h.kind === "verse"
                ? `#v${h.verse}`
                : h.kind === "range"
                  ? `#v${h.verseFrom}-${h.verseTo}`
                  : "";
            return (
              <article key={`hit-${i}`} className="min-w-0">
                <header className="mb-3 flex items-baseline justify-between gap-4 flex-wrap">
                  <h2 className="font-display-serif text-title text-paper leading-tight">
                    {label}
                  </h2>
                  <Link
                    href={`${chapterHref}${verseAnchor}`}
                    className="font-sans text-detail font-medium text-paper/55 hover:text-paper transition-colors"
                  >
                    <T k="bible.openInChapter" /> →
                  </Link>
                </header>
                <div className="font-serif text-body text-paper/85 leading-[1.75] space-y-3">
                  {b.body.verses.map((v) => (
                    <p key={v.n}>
                      <span className="font-sans text-caption font-semibold text-paper/45 mr-2 align-baseline">
                        {v.n}
                      </span>
                      {v.text}
                    </p>
                  ))}
                </div>
              </article>
            );
          })}
        </div>

        <footer className="mt-12 pt-6 border-t border-paper/8">
          <p className="font-sans text-detail text-paper/45">
            <T k="bible.multiBookmarkNote" />
          </p>
        </footer>
      </div>
    </section>
  );
}
