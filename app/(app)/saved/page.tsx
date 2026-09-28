import { SavedFlorilegiumCard } from "@/components/saved/SavedFlorilegiumCard";
import { SavedList } from "@/components/saved/SavedList";
import { T } from "@/components/i18n/T";
import { Eyebrow } from "@/components/ui/Graphite";

export const metadata = {
  title: "Your saved",
  description:
    "Every Bible verse, Bible chapter, and saint writing section you've bookmarked, in one place. Lives in your browser; syncs across devices when you sign in.",
};

/*
 * Redrawn 2026-09-28 at the owner's request, in the language of the Prayer
 * and Discover redesign: a left-aligned hero with the Florilegium beside it,
 * where it used to wait at the foot of the page, then the list, each group
 * in one graphite card (components/saved/SavedList.tsx).
 */
export default function SavedPage() {
  return (
    <section className="relative overflow-hidden bg-night min-h-[calc(100dvh-72px)] px-5 py-12 md:px-8 md:py-16">
      {/* The front page hero's candle glow, in white, behind the heading. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
        style={{
          background: "radial-gradient(ellipse 70% 60% at 20% 10%, rgba(255,255,255,0.05) 0%, transparent 65%)",
        }}
      />
      <article className="relative mx-auto w-full max-w-[1120px]">
        <header className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
          <div className="min-w-0">
            <Eyebrow>
              <T k="study.saved.eyebrow" />
            </Eyebrow>
            <h1 className="mt-4 text-heading font-bold leading-[1.05] tracking-[-0.025em] text-paper md:text-display-sm lg:text-display">
              <T k="study.saved.title" />
            </h1>
            <p className="mt-5 max-w-[560px] font-sans text-ui leading-[1.6] text-paper/75 md:text-lede">
              <T k="study.whatYouVeBookmarkedAnd" />
            </p>
          </div>
          <SavedFlorilegiumCard />
        </header>

        <SavedList />
      </article>
    </section>
  );
}
