import { Suspense } from "react";

import { MultiVerseClient } from "@/components/bible/MultiVerseClient";

// Multi-reference result page.
//
// Stacked list of every verse, range, or chapter the user requested in the
// BibleSearch bar with comma- or semicolon-separated references. Single
// reference queries continue to flow through the normal reader route and do
// not reach this page.
//
// This was a force-dynamic server page until 2026-07-26. It called loadChapter
// and loadVerseRange, which are server-only (they read data/bible off the
// filesystem), so it could not be exported and was stashed out of the Android
// bundle. In the app the search pushed to a route that did not exist and the
// shell dropped the user on Today: "after searching more than one reference it
// just kicks me out". Now it is a static shell over a client child that reads
// ?q= and fetches verse text from /api/bible/verse, which is the same pattern
// /campaigns/detail uses, and it ships in the bundle.
//
// Suspense is required: useSearchParams in an exported route must sit inside a
// boundary or the build fails.

export const metadata = {
  title: "Multi-verse · Bible",
  description:
    "A florilegium of verses, ranges, and chapters from a single query.",
};

export default function MultiPage() {
  return (
    <Suspense fallback={null}>
      <MultiVerseClient />
    </Suspense>
  );
}
