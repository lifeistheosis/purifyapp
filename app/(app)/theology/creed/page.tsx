import Link from "next/link";

import {
  CREED_ARTICLES,
  CREED_SOURCES,
  type CreedCouncil,
} from "@/lib/councils/creed";
import { loadCouncilDocument } from "@/lib/councils/load";
import { StillInEnglish } from "@/components/i18n/StillInEnglish";
import { T } from "@/components/i18n/T";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { CouncilMark } from "@/components/theology/CouncilMark";
import { LeafGlyph, LeafPage } from "@/components/theology/LeafPage";
import { LEAF_TITLE, WAY_TRAY } from "@/components/theology/wayStyle";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Codex } from "@/components/ui/icons/Codex";

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
 *
 * In the house style with Theology's other pages (1.9; components/theology/
 * LeafPage.tsx): its own bar, the page's name once its heading has gone up
 * under it, back to Theology, the search turned to Theology; its head the
 * hub's own row, grown, the book it wears there lit and its name in Lora;
 * and the two Symbols as rows in one raised tray, each with its council's
 * picture. It stood inside the old shell until then (the "Theology" label
 * over a row of four pills, the search pill floating over the words), the
 * last page that did. The Creed, its marks and their key are as they were
 * approved: not a word or a mark of them changed.
 */
export default async function CreedPage() {
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
    <>
      <MobileTopBar titleKey="creed.title" back backFallback="/theology" revealTitleOn={LEAF_TITLE} searchPlace="theology" />
      <LeafPage
        kind="creed"
        up={{ href: "/theology", label: "nav.discoverMenu.theology" }}
        mark={<LeafGlyph icon={Codex} carry="creed:lines" />}
        name={<T k="creed.title" />}
      >
        <div data-creed-page="">
          {/* The key: the words of Nicaea plain, the words Constantinople added lit. */}
          <p className="mt-5 flex flex-wrap items-baseline gap-x-5 gap-y-2 font-sans text-ui text-paper/72">
            <span>
              <T k="creed.nicaea" />
            </span>
            <mark className="creed-added">
              <T k="creed.constantinople" />
            </mark>
          </p>

          {/* In another language, one quiet line that the words are English, said on the device. */}
          <StillInEnglish kind="work" className="mt-6" />

          <ol className="mt-10 md:mt-12 space-y-7" data-creed="">
            {CREED_ARTICLES.map((a) => (
              <li key={a.n} className="flex gap-4" data-creed-article={a.n}>
                <span
                  aria-hidden
                  className="w-6 shrink-0 pt-[0.42em] text-end font-sans text-caption font-semibold tabular-nums text-paper/50"
                >
                  {a.n}
                </span>
                {/* The Creed's words are its English; they read left to right under Arabic and Urdu (build 90 note 4). */}
                <p lang="en" dir="ltr" className="min-w-0 font-serif text-lede leading-[1.7] text-paper/80">
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
          <ul data-creed-sources="" className={`${WAY_TRAY} mt-10`}>
            {sources.map((s) =>
              s.title ? (
                <li key={s.council} className="theology-rule">
                  <Link href={`/councils/${s.council}/${s.document}`} className="theology-row flex min-h-[56px] items-center gap-3 rounded-[14px] px-2 py-2">
                    <CouncilMark slug={s.council} />
                    <span className="min-w-0 flex-1">
                      <span lang="en" dir="ltr" className="block font-serif text-[15.5px] font-semibold leading-[1.26] text-paper/92">
                        {s.title}
                      </span>
                      <span className="mt-0.5 block font-sans text-caption text-paper/55">
                        <T k={s.council === "first-nicaea" ? "creed.nicaea" : "creed.constantinople"} />
                      </span>
                    </span>
                    <ChevronRight size={14} className="shrink-0 text-paper/45 rtl:-scale-x-100" />
                  </Link>
                </li>
              ) : null
            )}
          </ul>
        </div>
      </LeafPage>
    </>
  );
}
