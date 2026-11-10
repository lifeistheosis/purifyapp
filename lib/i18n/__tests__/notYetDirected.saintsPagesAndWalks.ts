// The note 4 families the Updates chat marks (the arbiter's split, 2026-11-10):
// the saints, What's New, the legal and information pages, history, the
// dictionary, the calendar, the parish finder, the shop and the walkthroughs
// (with the liturgy guide). Each file named with how many of its elements say
// a language and not yet its direction (lib/i18n/__tests__/textDirection.test.ts,
// which reads this list beside its own). Kept apart so that the two chats never
// edit one file at once. Lower a count, or remove the line, in the commit that
// marks them; a count may only fall.
export const SAINTS_PAGES_AND_WALKS: Record<string, number> = {
  "app/(app)/credits/page.tsx": 1,
  "components/calendar/CalendarClient.tsx": 1,
  "components/calendar/Colophon.tsx": 1,
  "components/calendar/PhoneCalendar.tsx": 1,
  "components/dictionary/Dictionary.tsx": 2,
  "components/legal/LegalSheet.tsx": 1,
  "components/saints/KeepReading.tsx": 2,
  "components/saints/MobileWorkPill.tsx": 1,
  "components/saints/QuotesSection.tsx": 1,
  "components/saints/WorkContents.tsx": 2,
  "components/saints/WorkHead.tsx": 3,
  "components/shop/ProductDetailClient.tsx": 1,
  "components/shop/ShopBySaint.tsx": 1,
  "components/start/liturgy/GuideSheets.tsx": 3,
  "components/walkthrough/BookWalkClient.tsx": 2,
  "components/walkthrough/ChapterList.tsx": 3,
  "components/walkthrough/ChapterWalkClient.tsx": 3,
  "components/walkthrough/Synthesis.tsx": 5,
  "components/walkthrough/WalkProgress.tsx": 1,
  "components/walkthrough/WalkSheets.tsx": 5,
  "components/walkthrough/WalkthroughsHub.tsx": 2,
};
