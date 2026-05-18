import { CategorizedBookList } from "@/components/bible/CategorizedBookList";
import { BibleSearch } from "@/components/bible/BibleSearch";
import { StartHereStrip } from "@/components/bible/StartHereStrip";
import {
  getOldTestamentCategories,
  getNewTestamentCategories,
} from "@/lib/bible/books";

export const metadata = {
  title: "The Orthodox Bible",
  description:
    "Read the Orthodox canon. Brenton's Septuagint and the King James Version with cross-references.",
};

const HERO = "px-5 md:px-8 pt-14 md:pt-20 pb-8 md:pb-12";
const SECTION = "px-5 md:px-8 py-16 md:py-20";

export default function BiblePage() {
  return (
    <>
      {/* Hero */}
      <section className={HERO + " bg-night"}>
        <div className="mx-auto max-w-[860px] w-full text-center">
          <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/60 mb-4">
            Scripture
          </p>
          <h1 className="font-sans text-[36px] md:text-[52px] font-bold leading-[1.05] tracking-[-0.025em] text-paper">
            The Orthodox Bible
          </h1>
          <p className="mt-5 font-sans text-[17px] text-paper/70 max-w-[560px] mx-auto">
            The full Orthodox canon. Septuagint Old Testament, King James New
            Testament, with cross-references and book introductions.
          </p>
          <div className="mt-8 max-w-[640px] mx-auto">
            <BibleSearch />
          </div>
          <p className="mt-3 font-sans italic text-[12px] text-paper/40">
            Try: &lsquo;John 3:16&rsquo; · &lsquo;1 Cor 13&rsquo; · &lsquo;Psalm 23&rsquo;
          </p>
        </div>
      </section>

      <StartHereStrip />

      <section
        id="ot"
        className={SECTION + " bg-night scroll-mt-20 border-t border-white/5"}
      >
        <div className="mx-auto max-w-[1080px] w-full">
          <CategorizedBookList
            label="Old Testament"
            categories={getOldTestamentCategories()}
          />
        </div>
      </section>

      <section
        id="nt"
        className={SECTION + " bg-night scroll-mt-20 border-t border-white/5"}
      >
        <div className="mx-auto max-w-[1080px] w-full">
          <CategorizedBookList
            label="New Testament"
            categories={getNewTestamentCategories()}
          />
        </div>
      </section>

      <section
        id="sources"
        className={SECTION + " bg-night-soft scroll-mt-20 border-t border-white/8"}
      >
        <div className="mx-auto max-w-[860px] w-full">
          <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-paper/50 mb-4">
            Sources &amp; notes
          </p>
          <ul className="space-y-2 font-sans text-[13px] text-paper/55 leading-[1.65]">
            <li>
              Old Testament: Brenton&rsquo;s English Septuagint (1851, public
              domain), including the deuterocanon.
            </li>
            <li>New Testament: King James Version (public domain).</li>
            <li>
              Patristic commentary: Schaff&rsquo;s Ante-Nicene and Nicene
              Fathers (public domain). Book introductions: original to this
              edition.
            </li>
            <li>
              Brenton follows Septuagint numbering for Psalms, which differs
              from the Hebrew by one in the middle range.
            </li>
            <li>
              A public-domain edition. Not affiliated with the trademarked{" "}
              <em>Orthodox Study Bible</em> published by Thomas Nelson.
            </li>
          </ul>
        </div>
      </section>
    </>
  );
}
