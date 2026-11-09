import Link from "next/link";

import {
  CREED_ARTICLES,
  CREED_SOURCES,
  type CreedCouncil,
} from "@/lib/councils/creed";
import { loadCouncilDocument } from "@/lib/councils/load";
import { getServerLocale } from "@/lib/i18n/server";
import { TheologyShell } from "@/components/theology/TheologyShell";
import { ContentNotYetTranslated } from "@/components/i18n/ContentNotYetTranslated";
import { T } from "@/components/i18n/T";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";

export const metadata = {
  title: "The Creed, line by line",
  description:
    "The Creed the Church recites, in its twelve articles, each phrase marked with the council that gave it: the 318 Fathers at Nicaea in 325, or the 150 at Constantinople in 381.",
};

/**
 * The Creed by council (1.9, s6-07 of docs/1.9-build/ideas.json; his yes of
 * 2026-11-09 to "a card at the head of Theology, opening the twelve
 * articles, the words added at Constantinople lit").
 *
 * The twelve articles of the Creed of 381 as lib/councils/creed.ts holds them,
 * each piece in the words of the app's own copies of both Symbols (the test
 * holds every piece to them). The words Constantinople added are lit, with the
 * selected verse's faint wash (.creed-added, app/globals.css); the words of
 * Nicaea stand plain. No word of framing is added: the page is the Creed, the
 * key to its marks, and the two Symbols it is read from, each on its own page
 * with its source.
 *
 * The Creed's words are the English of the two Symbols; in another language
 * the page says so, as each Symbol's own page does.
 *
 * The same for every reader, so it renders here and in the apps' export.
 */
export default async function CreedPage() {
  const locale = await getServerLocale();
  const sources = await Promise.all(
    (Object.keys(CREED_SOURCES) as CreedCouncil[])
      .map((c) => CREED_SOURCES[c])
      .sort((a, b) => a.year - b.year)
      .map(async (s) => ({
        ...s,
        title:
          (await loadCouncilDocument(s.council, s.document))?.content.title ??
          null,
      }))
  );

  return (
    <TheologyShell>
      <div data-creed-page="">
        <header>
          <h1 className="font-serif text-display-sm md:text-display font-bold leading-[1.08] tracking-[-0.02em] text-paper">
            <T k="creed.title" />
          </h1>
          {/* The key: the words of Nicaea plain, the words Constantinople added lit. */}
          <p className="mt-5 flex flex-wrap items-baseline gap-x-5 gap-y-2 font-sans text-ui text-paper/72">
            <span>
              <T k="creed.nicaea" />
            </span>
            <mark className="creed-added">
              <T k="creed.constantinople" />
            </mark>
          </p>
        </header>

        <ContentNotYetTranslated locale={locale} kind="work" />

        <ol className="mt-10 md:mt-12 space-y-7" data-creed="">
          {CREED_ARTICLES.map((a) => (
            <li key={a.n} className="flex gap-4" data-creed-article={a.n}>
              <span
                aria-hidden
                className="w-6 shrink-0 pt-[0.42em] text-end font-sans text-caption font-semibold tabular-nums text-paper/50"
              >
                {a.n}
              </span>
              <p className="min-w-0 font-serif text-lede leading-[1.7] text-paper/80">
                {a.pieces.map((p, i) =>
                  p.from === "first-constantinople" ? (
                    <mark key={i} className="creed-added">
                      {p.words}
                    </mark>
                  ) : (
                    <span key={i}>{p.words}</span>
                  )
                )}
              </p>
            </li>
          ))}
        </ol>

        {/* The two Symbols it is read from, each whole on its own page, with its source. */}
        <ul className="mt-12 divide-y divide-paper/[0.08] border-y border-paper/[0.08]">
          {sources.map((s) =>
            s.title ? (
              <li key={s.council}>
                <Link
                  href={`/councils/${s.council}/${s.document}`}
                  className="flex min-h-[56px] items-center gap-3 py-3 text-paper/90 transition-colors hover:text-paper"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-serif text-body font-semibold leading-tight">
                      {s.title}
                    </span>
                    <span className="mt-0.5 block font-sans text-caption text-paper/55">
                      <T
                        k={
                          s.council === "first-nicaea"
                            ? "creed.nicaea"
                            : "creed.constantinople"
                        }
                      />
                    </span>
                  </span>
                  <ChevronRight
                    size={14}
                    className="shrink-0 text-paper/40 rtl:-scale-x-100"
                  />
                </Link>
              </li>
            ) : null
          )}
        </ul>
      </div>
    </TheologyShell>
  );
}
