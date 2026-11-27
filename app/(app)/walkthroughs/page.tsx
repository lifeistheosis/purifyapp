import { T } from "@/components/i18n/T";
import { ArtHead } from "@/components/art/ArtHead";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { WalkSoon } from "@/components/walkthrough/WalkSoon";
import { WalkthroughsHub } from "@/components/walkthrough/WalkthroughsHub";
import { IS_STATIC_EXPORT } from "@/lib/platform/buildTarget";
import { BOOK_CHAPTERS, WALKTHROUGHS } from "@/lib/walkthroughs";
import { walkCoverSrc } from "@/lib/walkthroughs/cover";
import { walkthroughsEnabled } from "@/lib/walkthroughs/flags";

export const metadata = {
  title: "Walkthroughs",
  description: "Guided walks through the books of Scripture, a chapter at a time, with the Fathers beside you.",
};

// The free tier of the owner's specification of 2026-09-28: curated,
// chapter-by-chapter walks. Job first; Matthew follows in the same shape.
// A phone page since 1.7, with its own bar, whose name arrives once the
// heading has scrolled away and whose way back leads to Discover when there
// is nothing behind (the owner's note 24 of 2026-10-16).
export default function WalkthroughsPage() {
  return (
    <>
      <MobileTopBar titleKey="walk.hubTitle" back backFallback="/discover" revealTitleOn="walk-hub-title" />
      {/* Silver Night: this place's picture as its head, carried from its Discover door (2.0, components/art/ArtHead.tsx). */}
      <div className="bg-night px-5 pt-4 md:px-8">
        <div className="mx-auto w-full max-w-[720px]">
          <ArtHead place="walkthroughs" />
        </div>
      </div>
      {walkthroughsEnabled() ? (
        <WalkthroughsHub
          books={Object.values(WALKTHROUGHS).map((w) => ({
            book: w.book,
            title: w.title,
            intro: w.intro,
            total: BOOK_CHAPTERS[w.book] ?? w.chapters.length,
            cover: walkCoverSrc(w.cover, IS_STATIC_EXPORT),
          }))}
        />
      ) : (
        <WalkSoon id="walk-hub-title" title={<T k="walk.hubTitle" />} />
      )}
    </>
  );
}
