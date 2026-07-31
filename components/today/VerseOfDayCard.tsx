import { getVerseOfDayTable } from "@/lib/today/verseOfDay";
import { VerseOfDayView } from "./VerseOfDayView";

/**
 * Verse-of-the-day card on the mobile Today shell.
 *
 * This server component produces a date-keyed WINDOW of verses; the client
 * view picks the reader's own day out of it. It used to render one verse,
 * resolved from `new Date()` on the server, which meant the Android static
 * export baked the build day's verse into the APK and the hero card of the
 * whole app was stale for the life of that build.
 *
 * The text cannot simply move to the client: it is read out of data/bible
 * by `server-only` code with no filesystem on a device. Hence the window.
 *
 * Web renders per request, so it only needs enough days to cover whichever
 * side of UTC the reader's local day falls on. Android renders once, so it
 * needs to carry a long runway; ~14 months of compact entries costs on the
 * order of 100KB in a bundle already measured in hundreds of megabytes,
 * and the view degrades to the first entry rather than an empty card if an
 * install ever outlives the window.
 *
 * Verse text is Purify's public-domain Bible (Brenton LXX / KJV) via
 * lib/today/verseOfDay.ts. No copyrighted translation appears here.
 */
const WINDOW_DAYS = process.env.BUILD_TARGET === "android" ? 400 : 3;

export async function VerseOfDayCard() {
  // Start a day back so a reader behind UTC still finds their local day.
  const base = new Date();
  base.setUTCDate(base.getUTCDate() - 1);
  const table = await getVerseOfDayTable(base, WINDOW_DAYS);
  return <VerseOfDayView table={table} />;
}
