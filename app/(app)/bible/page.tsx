import { CategorizedBookList } from "@/components/bible/CategorizedBookList";
import { BibleSearch } from "@/components/bible/BibleSearch";
import { StartHereStrip } from "@/components/bible/StartHereStrip";
import { BibleContinueDesktop } from "@/components/bible/BibleContinueDesktop";
import { OrnamentHeadpiece } from "@/components/calendar/OrnamentHeadpiece";
import {
  getOldTestamentCategories,
  getNewTestamentCategories,
} from "@/lib/bible/books";
import { BibleMobile } from "@/components/mobile/BibleMobile";
import { T } from "@/components/i18n/T";

export const metadata = {
  title: "The Orthodox Bible",
  description:
    "Read the Orthodox canon. Brenton's Septuagint and the King James Version with cross-references.",
};

export default function BiblePage() {
  return (
    <>
      {/* Mobile shell, md:hidden inside, so this collapses to nothing on desktop. */}
      <BibleMobile />

      {/* Desktop, hidden on mobile and in the native shell at any width. */}
      <div className="hidden md:block native-md-hidden">
        {/* Masthead: the same editorial register as Discover and Theology. */}
        <section className="bg-night px-5 pt-14 md:px-8 md:pt-20 pb-10 md:pb-12">
          <div className="mx-auto w-full max-w-[860px] text-center">
            <OrnamentHeadpiece className="mx-auto mb-5 max-w-[400px]" />
            <p className="mb-3 font-sans text-caption font-semibold uppercase tracking-[1.6px] text-gold/85">
              <T k="bible.eyebrow" />
            </p>
            <h1 className="font-display-serif text-heading md:text-display text-paper leading-[1.05]">
              <T k="bible.h1" />
            </h1>
            <p className="mx-auto mt-4 max-w-[540px] font-serif italic text-ui md:text-body text-paper/70 leading-[1.65]">
              <T k="bible.lead" />
            </p>
            <div className="mx-auto mt-8 max-w-[640px]">
              <BibleSearch />
            </div>
            <p className="mt-3 font-sans italic text-caption text-paper/55">
              <T k="bible.tryExamples" />
            </p>
            <div className="mt-8">
              <BibleContinueDesktop />
            </div>
          </div>
        </section>

        <StartHereStrip />

        {/* The canon: both testaments side by side on wide screens, one
            quiet card language throughout. */}
        <section
          id="ot"
          className="scroll-mt-20 border-t border-white/5 bg-night px-5 py-16 md:px-8 md:py-20"
        >
          <div className="mx-auto grid w-full max-w-[1240px] gap-14 xl:grid-cols-2 xl:gap-16">
            <CategorizedBookList
              label={<T k="bible.theOldTestament" />}
              categories={getOldTestamentCategories()}
            />
            <div id="nt" className="scroll-mt-20">
              <CategorizedBookList
                label={<T k="bible.theNewTestament" />}
                categories={getNewTestamentCategories()}
              />
            </div>
          </div>
        </section>

        {/* Sources: the provenance card, in the same register as the
            History feature's visible citations. */}
        <section
          id="sources"
          className="scroll-mt-20 border-t border-white/8 bg-night px-5 pb-20 md:px-8"
        >
          <div className="mx-auto w-full max-w-[860px]">
            <div className="rounded-lg border border-paper/10 bg-paper/[0.02] px-6 py-6">
              <p className="mb-4 font-sans text-eyebrow font-semibold uppercase tracking-[1.8px] text-gold/80">
                <T k="bible.sourcesNotes" />
              </p>
              <ul className="space-y-2 font-sans text-detail text-paper/60 leading-[1.65]">
                <li>
                  <T k="bible.sourceOt" />
                </li>
                <li>
                  <T k="bible.sourceNt" />
                </li>
                <li>
                  <T k="bible.sourceCommentary" />
                </li>
                <li>
                  <T k="bible.sourcePsalmNumbering" />
                </li>
                <li>
                  <T k="bible.sourceTrademark" />{" "}
                  <em>Orthodox Study Bible</em> <T k="bible.sourceTrademarkTail" />
                </li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
