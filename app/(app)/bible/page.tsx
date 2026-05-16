import { CategorizedBookList } from "@/components/bible/CategorizedBookList";
import { BibleSearch } from "@/components/bible/BibleSearch";
import {
  getOldTestamentCategories,
  getNewTestamentCategories,
} from "@/lib/bible/books";

export const metadata = {
  title: "The Orthodox Bible - Purify",
  description:
    "Read the Orthodox canon. Brenton's Septuagint and the King James Version with cross-references.",
};

const SECTION = "px-5 md:px-8 py-20 md:py-28";

export default function BiblePage() {
  return (
    <>
      {/* Hero */}
      <section className={SECTION + " bg-night"}>
        <div className="mx-auto max-w-[860px] w-full text-center">
          <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/60 mb-4">
            Scripture
          </p>
          <h1 className="font-sans text-[44px] md:text-[64px] font-bold leading-[1.05] tracking-[-0.025em] text-paper">
            The Orthodox Bible
          </h1>
          <p className="mt-5 font-sans text-[17px] text-paper/70 max-w-[560px] mx-auto">
            The full Orthodox canon. Septuagint Old Testament, King James New
            Testament, with cross-references and book introductions.
          </p>
          <div className="mt-10 max-w-[640px] mx-auto">
            <BibleSearch />
          </div>
          <nav className="mt-12 flex items-center justify-center gap-6 font-sans text-[12px] uppercase tracking-[1.5px] text-paper/55">
            <a href="#ot" className="hover:text-paper transition-colors">
              Old Testament
            </a>
            <span className="text-paper/25">·</span>
            <a href="#nt" className="hover:text-paper transition-colors">
              New Testament
            </a>
            <span className="text-paper/25">·</span>
            <a href="#sources" className="hover:text-paper transition-colors">
              Sources
            </a>
          </nav>
        </div>
      </section>

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
            Sources & notes
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
