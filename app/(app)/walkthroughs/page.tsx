import { FeatureShell } from "@/components/feature/FeatureShell";
import { T } from "@/components/i18n/T";
import { WalkthroughsHub } from "@/components/walkthrough/WalkthroughsHub";
import { BOOK_CHAPTERS, WALKTHROUGHS } from "@/lib/walkthroughs";
import { walkthroughsEnabled } from "@/lib/walkthroughs/flags";

export const metadata = {
  title: "Walkthroughs",
  description: "Guided walks through the books of Scripture, a chapter at a time, with the Fathers beside you.",
};

// The free tier of the owner's specification of 2026-09-28: curated,
// chapter-by-chapter walks. Job first; Matthew follows in the same shape.
export default function WalkthroughsPage() {
  if (!walkthroughsEnabled()) {
    return <FeatureShell eyebrow={<T k="walk.eyebrow" />} title={<T k="walk.hubTitle" />} body={<T k="walk.comingSoon" />} />;
  }
  return (
    <WalkthroughsHub
      books={Object.values(WALKTHROUGHS).map((w) => ({
        book: w.book,
        title: w.title,
        intro: w.intro,
        total: BOOK_CHAPTERS[w.book] ?? w.chapters.length,
      }))}
    />
  );
}
