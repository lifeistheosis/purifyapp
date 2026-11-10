// The saints and the five German pages still choosing their words on the
// server: the reader's-language sweep's families that the Updates chat
// converts (the arbiter's split, 2026-11-10). Kept apart from
// serverLocale.test.ts, which reads this list beside its own, so that the two
// chats never edit one file at once. Remove a line in the commit that lets the
// device choose that page's words; the list may only shrink.
export const SAINTS_AND_PAGES: Record<string, string> = {
  "app/(app)/saints/[slug]/page.tsx": "55 saints' lives in German (data/saints/*/i18n/de.json)",
  "app/(app)/saints/page.tsx": "the Greek line under the heading, hidden for a Greek reader",
  "app/(app)/about/page.tsx": "About in German",
  "app/(app)/privacy/page.tsx": "the Privacy Policy in German",
  "app/(app)/faq/page.tsx": "the FAQ in German",
  "app/(app)/support/page.tsx": "Support in German",
  "app/(app)/whats-new/page.tsx": "What's New in German",
};
