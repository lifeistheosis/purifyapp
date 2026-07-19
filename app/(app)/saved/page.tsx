import Link from "next/link";
import { SavedList } from "@/components/saved/SavedList";
import { T } from "@/components/i18n/T";

export const metadata = {
  title: "Your saved",
  description:
    "Every Bible verse, Bible chapter, and saint writing section you've bookmarked, in one place. Lives in your browser; syncs across devices when you sign in.",
};

const SECTION = "px-5 md:px-8 py-16 md:py-24";

export default function SavedPage() {
  return (
    <section className={`${SECTION} bg-night min-h-[calc(100dvh-72px)]`}>
      <article className="mx-auto max-w-[760px] w-full">
        <p className="font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
          <T k="study.saved.eyebrow" />
        </p>
        <h1 className="font-sans text-display-sm md:text-display font-bold leading-[1.05] tracking-[-0.025em] text-paper">
          <T k="study.saved.title" />
        </h1>
        <p className="mt-6 font-serif text-lede text-paper/80 leading-[1.7] max-w-[620px]">
          <T k="study.whatYouVeBookmarkedAnd" />
        </p>
        <SavedList />

        <div className="mt-12 rounded-lg border border-paper/12 bg-paper/[0.03] p-5 hover:border-gold/40 transition-colors">
          <Link href="/florilegium" className="block">
            <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-gold/85 mb-1">
              <T k="study.florilegium.title" />
            </p>
            <p className="font-serif text-lede text-paper leading-tight">
              <T k="study.gatherTheLinesThatStrike" />
            </p>
            <p className="mt-1 font-serif italic text-detail text-paper/55 leading-[1.5]">
              <T k="study.yourOwnCollectionsOfVerses" />
            </p>
          </Link>
        </div>
      </article>
    </section>
  );
}
