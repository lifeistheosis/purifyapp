import {
  getOldTestamentCategories,
  getNewTestamentCategories,
} from "@/lib/bible/books";
import { MobileShell } from "./MobileShell";
import { MobileHeader } from "./MobileHeader";
import { SectionMasthead } from "./SectionMasthead";
import { BibleMobileContinue } from "./BibleMobileContinue";
import { BibleStudyRow } from "./BibleStudyRow";
import { BibleTabs } from "./BibleTabs";
import { BibleAppointedToday } from "./BibleAppointedToday";
import { T } from "@/components/i18n/T";

/**
 * Bible mobile shell: the picture, then an index.
 *
 *   1. Header. Its magnifier is the app-wide search, which opens a typed
 *      reference since 1.6. Until then this tab carried a second magnifier
 *      beside it for a Bible-only search: two of the same icon, side by
 *      side, each opening a different box.
 *   2. The Codex Sinaiticus plate.
 *   3. Continue reading: one row, only when localStorage has a last chapter.
 *   4. The day's readings: one row each.
 *   5. Reading plans and the journal: one row of two halves.
 *   6. Segmented Old/New Testament tabs.
 *   7. Categorised vertical list of books, a single tappable row per book.
 *
 * Everything under the picture is one kind of thing: the rows of
 * IndexRows.tsx. This header always said so ("no hero feed card ... no
 * coloured chips. The page is a library index, nothing more") while the
 * screen under it grew an empty card, two tinted pills, a band with a button
 * and a lone tile, five looks before the first book and the first book a
 * whole screen down (1007 px on a phone 844 tall). The owner, 2026-10-13:
 * "this design has way too much stuff going on here". He was shown it with
 * and without the picture and kept the picture. lib/ui/__tests__/
 * bibleIndex.test.ts holds the screen to this list, so the next thing added
 * here is added as a row or argued for.
 *
 * The appointed readings live in a CLIENT child on purpose. This component
 * used to compute them here with `startOfDayUtc(new Date())`, which under
 * `output: "export"` froze them at build time; see BibleAppointedToday.
 * Do not move that back up here. The book categories below are static and
 * are correctly resolved on the server.
 */
export function BibleMobile() {
  const otCats = getOldTestamentCategories();
  const ntCats = getNewTestamentCategories();

  return (
    <MobileShell
      header={<MobileHeader titleKey="nav.bible" />}
      eyebrow={<T k="saints.read" />}
    >
      {/* Codex Sinaiticus: the Greek uncial behind the text being read. */}
      <SectionMasthead section="bible" />

      <BibleMobileContinue />
      <BibleAppointedToday />
      <BibleStudyRow />

      <div className="mt-6">
        <BibleTabs ot={otCats} nt={ntCats} />
      </div>
    </MobileShell>
  );
}
