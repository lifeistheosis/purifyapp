import { SavedList } from "@/components/saved/SavedList";

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
        <p className="font-sans text-[13px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-4">
          Your saved
        </p>
        <h1 className="font-sans text-[36px] md:text-[46px] font-bold leading-[1.05] tracking-[-0.025em] text-paper">
          What you&rsquo;ve kept.
        </h1>
        <p className="mt-6 font-serif text-[18px] text-paper/80 leading-[1.7] max-w-[620px]">
          The verses, chapters, and saint writings you bookmarked, newest
          first. Tap a row to open. Sign in to sync across devices.
        </p>
        <SavedList />
      </article>
    </section>
  );
}
