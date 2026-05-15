import { BookGrid } from "@/components/bible/BookGrid";
import { getOldTestament, getNewTestament } from "@/lib/bible/books";

export const metadata = {
  title: "Orthodox Bible - Purify",
  description:
    "The Orthodox canon - Brenton's Septuagint and the King James Version - with cross-references and book introductions.",
};

export default function BiblePage() {
  return (
    <section className="bg-night px-5 md:px-8 py-16 md:py-24">
      <div className="mx-auto max-w-[1080px] w-full">
        <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/60 mb-4">
          Scripture
        </p>
        <h1 className="font-sans text-[40px] md:text-[56px] font-bold leading-[1.05] tracking-[-0.025em] text-paper">
          Orthodox Bible
        </h1>
        <p className="mt-5 max-w-[680px] font-sans text-[16px] text-paper/75">
          The full Orthodox canon - fifty Old Testament books from Brenton&rsquo;s
          English Septuagint (1851), including the deuterocanon, and the twenty-seven
          New Testament books from the King James Version. Every chapter is paired with
          cross-references, and the most-read books include short Orthodox introductions.
        </p>
        <p className="mt-3 max-w-[680px] font-sans text-[13px] text-paper/45">
          A public-domain edition. This is not the trademarked <em>Orthodox Study Bible</em>
          published by Thomas Nelson; the text, references, and introductions here are
          drawn entirely from public-domain and freely-licensed sources.
        </p>
        <BookGrid label="Old Testament" books={getOldTestament()} />
        <BookGrid label="New Testament" books={getNewTestament()} />
        <p className="mt-16 font-sans text-[12px] text-paper/40 leading-[1.7]">
          Old Testament: Brenton&rsquo;s English Septuagint (1851, public domain). New
          Testament: King James Version (public domain). Cross-references:
          openbible.info (CC&nbsp;BY 4.0). Book introductions: original to this edition.
          Brenton follows Septuagint numbering for Psalms, which differs from the Hebrew
          numbering in the middle range by one.
        </p>
      </div>
    </section>
  );
}
