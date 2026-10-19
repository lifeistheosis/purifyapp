import { SavedList } from "@/components/saved/SavedList";
import { T } from "@/components/i18n/T";
import { MobileTopBar } from "@/components/nav/MobileTopBar";

export const metadata = {
  title: "Your saved",
  description:
    "Every Bible verse, Bible chapter, and saint writing section you've bookmarked, in one place. Lives in your browser; syncs across devices when you sign in.",
};

/*
 * Your saved on a phone (1.7, the owner's note 21: "make it better for
 * phones, cleaner, a simpler UI"). The phone's own bar, whose title arrives
 * once the page's heading has gone up under it, then one list
 * (components/saved/SavedList.tsx). It was a desktop hero with a glow and a
 * large Florilegium card beside it, drawn the same on a phone. One centred
 * column on a tablet and a computer.
 */
export default function SavedPage() {
  return (
    <>
      <MobileTopBar titleKey="study.saved.eyebrow" back backFallback="/account" revealTitleOn="saved-title" />
      <section className="min-h-screen bg-night px-5 pb-32 pt-8 md:px-8 md:pt-14" aria-labelledby="saved-title">
        <div className="mx-auto w-full max-w-[760px]">
          <header>
            <h1 id="saved-title" className="text-title font-bold leading-[1.12] tracking-[-0.01em] text-paper md:text-heading">
              <T k="study.saved.eyebrow" />
            </h1>
            <p className="mt-2 max-w-[60ch] font-sans text-detail leading-[1.6] text-paper/55">
              <T k="study.whatYouVeBookmarkedAnd" />
            </p>
          </header>
          <SavedList />
        </div>
      </section>
    </>
  );
}
